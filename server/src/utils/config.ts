import fs from 'fs/promises';
import path from 'path';
import { Config } from '../types/index.js';
import winston from 'winston';
import { CONFIG_PATH } from './paths.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

const DEFAULT_CONFIG: Config = {
  calendars: [],
  display: {
    weekStart: 0,
    language: 'ja-JP',
    timezone: 'Asia/Tokyo'
  }
};

export async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(data) as Config;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.info('Config file not found, creating default configuration');
      await saveConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    logger.error('Failed to load config:', error);
    throw new Error('Failed to load configuration');
  }
}

export async function saveConfig(config: Config): Promise<void> {
  try {
    // Ensure directory exists
    const configDir = path.dirname(CONFIG_PATH);
    await fs.mkdir(configDir, { recursive: true });
    
    const data = JSON.stringify(config, null, 2);
    await fs.writeFile(CONFIG_PATH, data, 'utf-8');
    logger.info('Configuration saved successfully');
  } catch (error) {
    logger.error('Failed to save config:', error);
    throw new Error('Failed to save configuration');
  }
}

export function validateConfig(config: any): config is Config {
  if (!config || typeof config !== 'object') {
    return false;
  }

  if (!Array.isArray(config.calendars)) {
    return false;
  }

  for (const calendar of config.calendars) {
    if (!calendar.id || !calendar.name || !calendar.color) {
      return false;
    }
  }

  if (!config.display || 
      typeof config.display.weekStart !== 'number' ||
      !config.display.language ||
      !config.display.timezone) {
    return false;
  }

  return true;
}