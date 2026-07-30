import { Router } from 'express';
import jwt from 'jsonwebtoken';
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

    const user = await User.create({ email, password, name });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({ user, token });
  } catch (err) {
    if (err.message === 'USER_EXISTS') {
      // Generic message to prevent email enumeration or standard error
      return res.status(400).json({ error: 'Invalid email or password' });
    }
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

    const userObj = await User.findByEmail(email);
    if (!userObj) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await User.verifyPassword(userObj, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: userObj.id, email: userObj.email }, JWT_SECRET, {
      expiresIn: '7d',
    });
    const safeUser = {
      id: userObj.id,
      email: userObj.email,
      name: userObj.name,
    };

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
    return res.json({ user });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  return res.json({ message: 'Logged out successfully' });
});

export default router;
