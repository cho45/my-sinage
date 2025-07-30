import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import winston from 'winston';
import { AuthToken } from '../types/index.js';
import { TOKEN_PATH } from '../utils/paths.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

export class OAuthManager {
  private oauth2Client;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing OAuth2 credentials in environment variables');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  /**
   * Generate the authentication URL
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokenFromCode(code: string): Promise<AuthToken> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      await this.saveToken(tokens as AuthToken);
      this.oauth2Client.setCredentials(tokens);
      return tokens as AuthToken;
    } catch (error) {
      logger.error('Error getting token from code:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Save token to file
   */
  private async saveToken(token: AuthToken): Promise<void> {
    try {
      // Ensure directory exists
      const tokenDir = path.dirname(TOKEN_PATH);
      await fs.mkdir(tokenDir, { recursive: true });
      
      await fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2));
      logger.info('Token saved successfully');
    } catch (error) {
      logger.error('Error saving token:', error);
      throw new Error('Failed to save token');
    }
  }

  /**
   * Load token from file
   */
  async loadToken(): Promise<AuthToken | null> {
    try {
      const tokenData = await fs.readFile(TOKEN_PATH, 'utf-8');
      const token = JSON.parse(tokenData) as AuthToken;
      this.oauth2Client.setCredentials(token);
      
      // Check if token needs refresh
      if (token.expiry_date && token.expiry_date < Date.now()) {
        logger.info('Token expired, refreshing...');
        return await this.refreshToken();
      }
      
      return token;
    } catch (error) {
      logger.info('No saved token found');
      return null;
    }
  }

  /**
   * Refresh the access token
   */
  private async refreshToken(): Promise<AuthToken | null> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      const token = credentials as AuthToken;
      await this.saveToken(token);
      return token;
    } catch (error) {
      logger.error('Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Check if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.loadToken();
    return token !== null;
  }

  /**
   * Get authenticated client
   */
  async getAuthenticatedClient() {
    const token = await this.loadToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    return this.oauth2Client;
  }

  /**
   * Reset authentication
   */
  async resetAuth(): Promise<void> {
    try {
      await fs.unlink(TOKEN_PATH);
      logger.info('Authentication reset successfully');
    } catch (error) {
      logger.error('Error resetting authentication:', error);
    }
  }
}