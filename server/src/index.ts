import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import helmet from 'helmet';
import winston from 'winston';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.js';
import weatherRouter from './routes/weather.js';
import { requireGoogleAuth, requireAdminAuth } from './middleware/auth.js';
import { loadConfig, saveConfig, validateConfig } from './utils/config.js';
import { CalendarService } from './calendar/calendarService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// SSE client connections management
const sseClients: Set<Response> = new Set();

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,  // Disable default directives including upgrade-insecure-requests
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"]
    }
  }
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Static files - serve Vue app (production only)
const clientPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientPath));

// API Routes
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Calendar API endpoint
app.get('/api/calendar', requireGoogleAuth, async (req: Request, res: Response) => {
  try {
    const calendarService = new CalendarService();
    
    // Get start date from query params or use current date
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string)
      : new Date();
    
    const events = await calendarService.getWeekRangeEvents(startDate);
    
    res.json({ 
      events,
      startDate: startDate.toISOString(),
      endDate: new Date(startDate.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    logger.error('Error fetching calendar data:', error);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

// Config API endpoints
app.get('/api/config', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const config = await loadConfig();
    res.json(config);
  } catch (error) {
    logger.error('Error reading config:', error);
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

// Calendar list endpoint
app.get('/api/calendars', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const calendarService = new CalendarService();
    const calendars = await calendarService.getCalendarList();
    
    // Format calendar list for display
    const formattedCalendars = calendars.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      primary: cal.primary,
      backgroundColor: cal.backgroundColor,
      foregroundColor: cal.foregroundColor,
      accessRole: cal.accessRole
    }));
    
    res.json({ calendars: formattedCalendars });
  } catch (error) {
    logger.error('Error fetching calendar list:', error);
    res.status(500).json({ error: 'Failed to fetch calendar list' });
  }
});

app.post('/api/config', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const newConfig = req.body;
    
    if (!validateConfig(newConfig)) {
      res.status(400).json({ error: 'Invalid configuration format' });
      return;
    }
    
    await saveConfig(newConfig);
    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    logger.error('Error saving config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Weather routes
app.use('/api/weather', weatherRouter);

// Auth routes
app.use('/auth', authRouter);

// Admin auth reset endpoint
app.post('/api/auth/reset', requireAdminAuth, authRouter);

// SSE endpoint for real-time events
app.get('/api/sse/events', (req: Request, res: Response) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial connection message
  res.write('data: {"type": "connected"}\n\n');
  
  // Add client to the set
  sseClients.add(res);
  logger.info(`SSE client connected. Total clients: ${sseClients.size}`);
  
  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(res);
    logger.info(`SSE client disconnected. Total clients: ${sseClients.size}`);
  });
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(':keep-alive\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// Admin reload command endpoint
app.post('/api/admin/reload', requireAdminAuth, (_req: Request, res: Response) => {
  logger.info('Reload command received from admin');
  
  // Send reload event to all connected SSE clients
  let successCount = 0;
  const failedClients: Response[] = [];
  
  sseClients.forEach(client => {
    try {
      client.write(`data: {"type": "reload", "timestamp": "${new Date().toISOString()}"}\n\n`);
      successCount++;
    } catch (error) {
      logger.error('Failed to send reload event to client:', error);
      failedClients.push(client);
    }
  });
  
  // Remove failed clients
  failedClients.forEach(client => sseClients.delete(client));
  
  res.json({ 
    success: true, 
    message: `Reload command sent to ${successCount} client(s)`,
    totalClients: sseClients.size
  });
});

// Setup and Admin pages are handled by Vue Router
// These will be served through the catch-all route below

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});
