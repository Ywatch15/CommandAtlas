import { prisma } from '../../../lib/prisma.js';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok', service: 'commandatlas-web', db: 'connected' });
  } catch (err) {
    return Response.json(
      { status: 'degraded', service: 'commandatlas-web', db: 'unreachable', error: err.message },
      { status: 503 }
    );
  }
}
