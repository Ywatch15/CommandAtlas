import { prisma } from '../../../../lib/prisma.js';
import { getAuthenticatedUser } from '../../../../lib/server-auth.js';

export async function GET(request) {
  try {
    const decoded = getAuthenticatedUser(request);
    if (!decoded || !decoded.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return Response.json({ user }, { status: 200 });
  } catch {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
