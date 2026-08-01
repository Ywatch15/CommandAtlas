import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import contributionsRoutes from './routes/contributions.js';
import analyticsRoutes from './routes/analytics.js';
import { csrfProtection } from './middleware/csrf.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);

app.use('/api/sync', csrfProtection, syncRoutes);
app.use('/api/v1/sync', csrfProtection, syncRoutes);

app.use('/api/contributions', contributionsRoutes);
app.use('/api/v1/contributions', contributionsRoutes);

app.use('/api/analytics', analyticsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'commandatlas-server' });
});

if (process.env.NODE_ENV !== 'test') {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('FATAL: MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  mongoose
    .connect(mongoUri)
    .then(() => {
      app.listen(PORT, () => {
        // Server startup
      });
    })
    .catch((err) => {
      console.error('FATAL: Failed to connect to MongoDB:', err.message);
      process.exit(1);
    });
}

export default app;
