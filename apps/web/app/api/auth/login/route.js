import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../../lib/prisma.js';
import { JWT_SECRET } from '../../../../lib/server-auth.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userObj = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!userObj) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, userObj.passwordHash);
    if (!isValid) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: userObj.id },
      data: { lastLoginAt: new Date() },
    });

    const safeUser = {
      id: userObj.id,
      email: userObj.email,
      name: userObj.name,
    };

    const token = jwt.sign({ id: safeUser.id, email: safeUser.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return Response.json({ user: safeUser, token }, { status: 200 });
  } catch (err) {
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
