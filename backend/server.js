import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import applicationRoutes from './routes/applicationRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: clientUrl === '*' ? '*' : [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  return res.status(200).json({
    success: true,
    message: isConnected ? 'API and database are healthy' : 'API is running; database is not connected',
    data: { databaseConnected: isConnected }
  });
});

// Applications API routes
app.use('/api/applications', applicationRoutes);

// In production, serve the built React frontend from frontend/dist
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 handler for unknown API routes
app.use(notFoundHandler);

// Centralized error-handling middleware
app.use(errorHandler);

// Connect to MongoDB Atlas
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri || mongoUri === 'YOUR_TEST_MONGODB_ATLAS_URI') {
  console.warn('[Server] Notice: MONGODB_URI is not set or contains the default placeholder.');
  console.warn('[Server] To connect to MongoDB Atlas, set MONGODB_URI in backend/.env with your connection string.');
  app.listen(port, () => {
    console.log(`[Server] API listening on http://localhost:${port}`);
  });
} else {
  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log('[Server] Successfully connected to MongoDB Atlas');
      app.listen(port, () => {
        console.log(`[Server] API listening on http://localhost:${port}`);
      });
    })
    .catch((err) => {
      console.error('[Server] MongoDB connection error:', err.message);
      app.listen(port, () => {
        console.log(`[Server] API listening on http://localhost:${port} (database disconnected)`);
      });
    });
}

export default app;
