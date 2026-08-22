import express from 'express';
import { prisma } from '../lib/prisma.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = express.Router();

// POST /api/analytics/zero-result — record a zero-result search (privacy-respecting, no PII)
router.post('/zero-result', csrfProtection, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query string required' });
    }

    const sanitized = query.toLowerCase().trim().substring(0, 100);
    if (!sanitized) {
      return res.status(400).json({ error: 'Empty query' });
    }

    const existing = await prisma.zeroResultQuery.findUnique({
      where: { queryText: sanitized },
    });

    if (existing) {
      await prisma.zeroResultQuery.update({
        where: { id: existing.id },
        data: {
          count: { increment: 1 },
          lastQueriedAt: new Date(),
        },
      });
    } else {
      await prisma.zeroResultQuery.create({
        data: {
          queryText: sanitized,
          count: 1,
          lastQueriedAt: new Date(),
        },
      });
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to record zero-result query' });
  }
});

// GET /api/analytics/zero-results — fetch top zero-result queries for maintainers
router.get('/zero-results', async (req, res) => {
  try {
    const list = await prisma.zeroResultQuery.findMany({
      orderBy: { count: 'desc' },
      take: 100,
    });
    res.json({ zeroResults: list });
  } catch {
    res.status(500).json({ error: 'Failed to fetch zero-result queries' });
  }
});

export default router;
