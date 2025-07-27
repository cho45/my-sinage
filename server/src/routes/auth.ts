import { Router, Request, Response } from 'express';
import { OAuthManager } from '../auth/oauth.js';
import winston from 'winston';

const router = Router();
let oauthManager: OAuthManager | null = null;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Lazy initialization of OAuthManager
const getOAuthManager = (): OAuthManager => {
  if (!oauthManager) {
    oauthManager = new OAuthManager();
  }
  return oauthManager;
};

/**
 * Start OAuth flow
 */
router.get('/login', (_req: Request, res: Response) => {
  try {
    const authUrl = getOAuthManager().getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Error starting OAuth flow:', error);
    res.status(500).json({ error: 'Failed to start authentication' });
  }
});

/**
 * OAuth callback
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error) {
    logger.error('OAuth error:', error);
    res.redirect('/setup?error=auth_denied');
    return;
  }

  if (!code || typeof code !== 'string') {
    res.redirect('/setup?error=no_code');
    return;
  }

  try {
    await getOAuthManager().getTokenFromCode(code);
    logger.info('Authentication successful');
    res.redirect('/');
  } catch (error) {
    logger.error('Error handling OAuth callback:', error);
    res.redirect('/setup?error=token_exchange_failed');
  }
});

/**
 * Reset authentication
 */
router.post('/reset', async (_req: Request, res: Response) => {
  try {
    await getOAuthManager().resetAuth();
    res.json({ success: true, message: 'Authentication reset successfully' });
  } catch (error) {
    logger.error('Error resetting auth:', error);
    res.status(500).json({ error: 'Failed to reset authentication' });
  }
});

/**
 * Check authentication status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const isAuthenticated = await getOAuthManager().isAuthenticated();
    res.json({ authenticated: isAuthenticated });
  } catch (error) {
    logger.error('Error checking auth status:', error);
    res.status(500).json({ error: 'Failed to check authentication status' });
  }
});

export default router;