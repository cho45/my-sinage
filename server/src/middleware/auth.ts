import { Request, Response, NextFunction } from 'express';
import { OAuthManager } from '../auth/oauth.js';

let oauthManager: OAuthManager | null = null;

// Lazy initialization of OAuthManager
const getOAuthManager = (): OAuthManager => {
  if (!oauthManager) {
    oauthManager = new OAuthManager();
  }
  return oauthManager;
};

/**
 * Middleware to check if user is authenticated with Google
 */
export async function requireGoogleAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const isAuthenticated = await getOAuthManager().isAuthenticated();
    
    if (!isAuthenticated) {
      res.redirect('/setup');
      return;
    }
    
    next();
  } catch (error) {
    console.error('Auth check error:', error);
    res.redirect('/setup');
  }
}

/**
 * Middleware to check admin password
 */
export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    res.status(500).json({ error: 'Admin password not configured' });
    return;
  }

  // Check session
  if (req.session && (req.session as any).isAdmin) {
    next();
    return;
  }

  // Check basic auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (username === 'admin' && password === adminPassword) {
    if (req.session) {
      (req.session as any).isAdmin = true;
    }
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    res.status(401).json({ error: 'Invalid credentials' });
  }
}