import path from 'path';

if (!process.env.DATA_DIR) {
  throw new Error('DATA_DIR environment variable is not set');
}

export const DATA_DIR = path.resolve("..", process.env.DATA_DIR);
export const TOKEN_PATH = path.join(DATA_DIR, 'tokens/token.json');
export const CONFIG_PATH = path.join(DATA_DIR, 'calendars.json');
export const TOKENS_DIR = path.join(DATA_DIR, 'tokens');

console.log('DATA_DIR:', DATA_DIR);
console.log('TOKEN_PATH:', TOKEN_PATH);
console.log('CONFIG_PATH:', CONFIG_PATH);
console.log('TOKENS_DIR:', TOKENS_DIR);
