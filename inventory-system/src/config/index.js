import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  stripeSecret: process.env.STRIPE_SECRET,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  env: process.env.NODE_ENV || 'development',
};