import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { prisma } from './lib/prisma.js';
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

app.get('/api/health', async (_req, res) => {
  try {
    // Verify Prisma can reach the database
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'commandatlas-server', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', service: 'commandatlas-server', db: 'unreachable' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('FATAL: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  // Verify Prisma Client can connect, then start the server
  prisma
    .$connect()
    .then(() => {
      app.listen(PORT, () => {
        // Server startup
      });

      // Session TTL cleanup — runs every hour.
      // Postgres has no native TTL index like MongoDB, so we delete expired
      // Session rows on a schedule. Hourly is sufficient because session reads
      // already check expiresAt (treating expired rows as invalid), so this
      // cron is only for storage hygiene, not correctness.
      cron.schedule('0 * * * *', async () => {
        try {
          const result = await prisma.session.deleteMany({
            where: { expiresAt: { lt: new Date() } },
          });
          if (result.count > 0) {
            console.log(`Session cleanup: removed ${result.count} expired session(s)`);
          }
        } catch (err) {
          console.error('Session cleanup error:', err.message);
        }
      });
    })
    .catch((err) => {
      console.error('FATAL: Failed to connect to database:', err.message);
      process.exit(1);
    });
}

export default app;
