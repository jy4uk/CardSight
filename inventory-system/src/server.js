import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { config } from './config/index.js';

const app = express();

// CORS configuration - must allow credentials for cookies
const allowedOrigins = [
  'http://localhost:5173',
  'https://card-pilot.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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