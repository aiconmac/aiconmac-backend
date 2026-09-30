// backend-api/src/app.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import allRoutes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

dotenv.config(); // Load environment variables from .env

const app = express();

// Railway's edge proxy is the one hop in front of us; rate limits key on req.ip, which must be the client, not the proxy.
app.set('trust proxy', 1);

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_MAIN_URL,
  process.env.CLIENT_COMPANY_URL,
  // Add other allowed origins if necessary
];

// Check if the app is running in development or production
const isDevelopment = process.env.NODE_ENV === 'development';

const corsOptions = {
  origin: (origin, callback) => {
    // Allow localhost during development and explicitly allowed origins in production
    if (isDevelopment || !origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json()); // For JSON data
app.use(express.urlencoded({ extended: true })); // For URL-encoded data

// API Routes
app.use('/api', allRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'API is healthy!' });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

export default app;