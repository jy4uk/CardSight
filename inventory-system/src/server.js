import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { config } from './config/index.js';

const app = express();

// CORS configuration - must allow credentials for cookies
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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