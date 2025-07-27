import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Config } from '../types/index.js';
import winston from 'winston';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

const CONFIG_PATH = path.join(__dirname, '../../../config/calendars.json');

export async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(data) as Config;
  } catch (error) {
    logger.error('Failed to load config:', error);
    throw new Error('Failed to load configuration');
  }
}

export async function saveConfig(config: Config): Promise<void> {
  try {
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