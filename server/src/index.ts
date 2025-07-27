// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from parent directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Debug: Check if environment variables are loaded
console.log('Environment variables loaded:', {
  PORT: process.env.PORT,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
});

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import winston from 'winston';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.js';
import { requireGoogleAuth, requireAdminAuth } from './middleware/auth.js';
import { loadConfig, saveConfig, validateConfig } from './utils/config.js';
import { CalendarService } from './calendar/calendarService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/combined.log') }),
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
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
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
    secure: process.env.NODE_ENV === 'production',
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

// Static files - serve Vue app
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

// Auth routes
app.use('/auth', authRouter);

// Admin auth reset endpoint
app.post('/api/auth/reset', requireAdminAuth, authRouter);

// Setup and Admin pages are handled by Vue Router
// These will be served through the catch-all route below

// Catch all - serve Vue app
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
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