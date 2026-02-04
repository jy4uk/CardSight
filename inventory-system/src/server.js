import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { config } from './config/index.js';

const app = express();

// Trust proxy - CRITICAL for production (Vercel/Railway/etc behind reverse proxy)
// This allows Express to correctly detect HTTPS and set Secure cookies
app.set('trust proxy', 1);

// CORS configuration - must allow credentials for cookies
// UPDATED: With Vercel rewrites, requests come from Vercel's servers (server-to-server)
// The Origin header will be the Vercel frontend domain
const allowedOrigins = [
  'http://localhost:5173',
  'https://card-pilot.vercel.app',
  'https://cardsight.vercel.app',
  'https://cardsight-production.up.railway.app', // Backend itself (for health checks)
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps, curl)
    // This is important for Vercel rewrites which may not send Origin header
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log rejected origins for debugging
      console.log('CORS rejected origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (_, res) => res.json({ ok: true }));

// API routes
app.use('/api', routes);

app.listen(config.port, () => console.log(`Server running on port ${config.port}`));