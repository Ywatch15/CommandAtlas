import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_cmd_atlas';

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email and password (min 6 chars) are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      name: name || '',
    });

    const safeUser = { id: user._id.toString(), email: user.email, name: user.name };
    const token = jwt.sign({ id: safeUser.id, email: safeUser.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({ user: safeUser, token });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userObj = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!userObj) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await User.verifyPassword(userObj, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    userObj.lastLoginAt = new Date();
    await userObj.save();

    const safeUser = {
      id: userObj._id.toString(),
      email: userObj.email,
      name: userObj.name,
    };

    const token = jwt.sign({ id: safeUser.id, email: safeUser.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({ user: safeUser, token });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const safeUser = { id: user._id.toString(), email: user.email, name: user.name };
    return res.json({ user: safeUser });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  return res.json({ message: 'Logged out successfully' });
});

export default router;
