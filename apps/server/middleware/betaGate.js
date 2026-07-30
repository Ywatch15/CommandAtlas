export function betaGate(req, res, next) {
  if (process.env.CLOSED_BETA_ENABLED !== 'true') {
    return next();
  }

  const betaInviteKey = req.headers['x-beta-invite-key'];
  const validKey = process.env.BETA_INVITE_KEY || 'beta-2026-access';

  if (!betaInviteKey || betaInviteKey !== validKey) {
    return res.status(403).json({
      error: 'Closed Beta Access Required',
      message:
        'Provide a valid X-Beta-Invite-Key header to access this endpoint during closed beta testing.',
    });
  }

  next();
}
