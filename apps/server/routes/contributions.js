import express from 'express';
import { prisma } from '../lib/prisma.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = express.Router();

// GET /api/contributions — list contributions
router.get('/', async (req, res) => {
  try {
    const list = await prisma.contribution.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ contributions: list });
  } catch {
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

// POST /api/contributions/webhook — receive GitHub PR metadata webhook
router.post('/webhook', csrfProtection, async (req, res) => {
  try {
    const { prNumber, prUrl, contributorHandle, status, reviewNotes } = req.body;
    if (!prNumber || !prUrl || !contributorHandle) {
      return res.status(400).json({ error: 'Missing required PR metadata fields' });
    }

    const contribution = await prisma.contribution.upsert({
      where: { prNumber },
      update: {
        prUrl,
        contributorHandle,
        status: status || 'pending',
        reviewNotes: reviewNotes || '',
      },
      create: {
        prNumber,
        prUrl,
        contributorHandle,
        status: status || 'pending',
        reviewNotes: reviewNotes || '',
      },
    });

    res.json({ success: true, contribution });
  } catch {
    res.status(500).json({ error: 'Failed to record contribution metadata' });
  }
});

export default router;
