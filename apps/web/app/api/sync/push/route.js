import { prisma } from '../../../../lib/prisma.js';
import { getAuthenticatedUser } from '../../../../lib/server-auth.js';

export async function POST(request) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user || !user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { bookmarks = [], notes = [] } = body;

    for (const bm of bookmarks) {
      if (bm.deleted) {
        await prisma.bookmark.deleteMany({
          where: { userId: user.id, commandSlug: bm.commandSlug },
        });
      } else {
        await prisma.bookmark.upsert({
          where: {
            userId_commandSlug: { userId: user.id, commandSlug: bm.commandSlug },
          },
          update: {
            createdAt: bm.createdAt ? new Date(bm.createdAt) : new Date(),
          },
          create: {
            userId: user.id,
            commandSlug: bm.commandSlug,
            createdAt: bm.createdAt ? new Date(bm.createdAt) : new Date(),
          },
        });
      }
    }

    for (const note of notes) {
      if (note.deleted || !note.content) {
        await prisma.note.deleteMany({
          where: { userId: user.id, commandSlug: note.commandSlug },
        });
      } else {
        const existing = await prisma.note.findFirst({
          where: { userId: user.id, commandSlug: note.commandSlug },
        });
        if (existing) {
          await prisma.note.update({
            where: { id: existing.id },
            data: {
              content: note.content,
              updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
            },
          });
        } else {
          await prisma.note.create({
            data: {
              userId: user.id,
              commandSlug: note.commandSlug,
              content: note.content,
            },
          });
        }
      }
    }

    return Response.json({ success: true, syncedAt: new Date().toISOString() }, { status: 200 });
  } catch (err) {
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
