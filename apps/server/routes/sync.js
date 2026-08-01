import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Bookmark } from '../models/Bookmark.js';
import { Note } from '../models/Note.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_cmd_atlas';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

// GET /api/sync/pull — fetch all user data from server
router.get('/pull', requireAuth, async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.userId });
    const notes = await Note.find({ userId: req.userId });
    return res.json({ bookmarks, notes });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sync/push — last-write-wins update
router.post('/push', requireAuth, async (req, res) => {
  try {
    const { bookmarks = [], notes = [] } = req.body || {};

    for (const bm of bookmarks) {
      if (bm.deleted) {
        await Bookmark.deleteOne({ userId: req.userId, commandSlug: bm.commandSlug });
      } else {
        await Bookmark.findOneAndUpdate(
          { userId: req.userId, commandSlug: bm.commandSlug },
          {
            userId: req.userId,
            commandSlug: bm.commandSlug,
            createdAt: bm.createdAt || new Date(),
          },
          { upsert: true, new: true }
        );
      }
    }

    for (const note of notes) {
      if (note.deleted || !note.content) {
        await Note.deleteOne({ userId: req.userId, commandSlug: note.commandSlug });
      } else {
        await Note.findOneAndUpdate(
          { userId: req.userId, commandSlug: note.commandSlug },
          {
            userId: req.userId,
            commandSlug: note.commandSlug,
            content: note.content,
            updatedAt: note.updatedAt || new Date(),
          },
          { upsert: true, new: true }
        );
      }
    }

    return res.json({ success: true, syncedAt: new Date().toISOString() });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sync/merge — ARCHITECTURE §7 / ADR-009 Account Merge on First Login
router.post('/merge', requireAuth, async (req, res) => {
  try {
    const { localBookmarks = [], localNotes = [] } = req.body || {};
    let mergedCount = 0;

    for (const bm of localBookmarks) {
      if (bm.commandSlug) {
        await Bookmark.findOneAndUpdate(
          { userId: req.userId, commandSlug: bm.commandSlug },
          {
            userId: req.userId,
            commandSlug: bm.commandSlug,
            createdAt: bm.createdAt || new Date(),
          },
          { upsert: true, new: true }
        );
        mergedCount++;
      }
    }

    for (const note of localNotes) {
      if (note.commandSlug && note.content) {
        await Note.findOneAndUpdate(
          { userId: req.userId, commandSlug: note.commandSlug },
          {
            userId: req.userId,
            commandSlug: note.commandSlug,
            content: note.content,
            updatedAt: note.updatedAt || new Date(),
          },
          { upsert: true, new: true }
        );
        mergedCount++;
      }
    }

    return res.json({
      success: true,
      mergedCount,
      message: `Successfully merged ${mergedCount} local item(s) to your account`,
    });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
