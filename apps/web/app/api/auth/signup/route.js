import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../../lib/prisma.js';
import { JWT_SECRET } from '../../../../lib/server-auth.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password, name } = body;

    if (!email || !password || password.length < 6) {
      return Response.json(
        { error: 'Email and password (min 6 chars) are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return Response.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name || '',
      },
    });

    const safeUser = { id: user.id, email: user.email, name: user.name };
    const token = jwt.sign({ id: safeUser.id, email: safeUser.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return Response.json({ user: safeUser, token }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
