import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import { csrfProtection } from './middleware/csrf.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/sync', csrfProtection, syncRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'commandatlas-server' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    // Server startup
  });
}

export default app;
