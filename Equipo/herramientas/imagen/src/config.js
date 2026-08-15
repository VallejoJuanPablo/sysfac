import 'dotenv/config';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === 'tu_api_key_aqui') {
  console.error('Error: GEMINI_API_KEY no configurada.');
  console.error('Copiá .env.example a .env y agregá tu key de Google AI Studio.');
  process.exit(1);
}

export const config = {
  apiKey,
  model: 'gemini-2.5-flash-image',
  outputDir: join(__dirname, '..', 'output'),
};
