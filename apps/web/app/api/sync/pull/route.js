import { prisma } from '../../../../lib/prisma.js';
import { getAuthenticatedUser } from '../../../../lib/server-auth.js';

export async function GET(request) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user || !user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookmarks = await prisma.bookmark.findMany({ where: { userId: user.id } });
    const notes = await prisma.note.findMany({ where: { userId: user.id } });

    return Response.json({ bookmarks, notes }, { status: 200 });
  } catch {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
