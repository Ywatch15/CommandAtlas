import { prisma } from '../../../../lib/prisma.js';
import { getAuthenticatedUser } from '../../../../lib/server-auth.js';

export async function POST(request) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user || !user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { localBookmarks = [], localNotes = [] } = body;
    let mergedCount = 0;

    for (const bm of localBookmarks) {
      if (bm.commandSlug) {
        await prisma.bookmark.upsert({
          where: {
            userId_commandSlug: { userId: user.id, commandSlug: bm.commandSlug },
          },
          update: {},
          create: {
            userId: user.id,
            commandSlug: bm.commandSlug,
            createdAt: bm.createdAt ? new Date(bm.createdAt) : new Date(),
          },
        });
        mergedCount++;
      }
    }

    for (const note of localNotes) {
      if (note.commandSlug && note.content) {
        const existing = await prisma.note.findFirst({
          where: { userId: user.id, commandSlug: note.commandSlug },
        });
        if (!existing) {
          await prisma.note.create({
            data: {
              userId: user.id,
              commandSlug: note.commandSlug,
              content: note.content,
            },
          });
        }
        mergedCount++;
      }
    }

    return Response.json({
      success: true,
      mergedCount,
      message: `Successfully merged ${mergedCount} local item(s) to your account`,
    });
  } catch (err) {
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
