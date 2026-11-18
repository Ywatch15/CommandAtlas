import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_cmd_atlas';

/**
 * Verify Authorization header from a Next.js Request.
 * @param {Request} request
 * @returns {{ id: string, email: string } | null}
 */
export function getAuthenticatedUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
