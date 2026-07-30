export function csrfProtection(req, res, next) {
  // Safe HTTP methods do not require CSRF token
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  // Reject mutating request if CSRF token header is missing
  if (!token) {
    return res.status(403).json({ error: 'CSRF token missing or invalid' });
  }

  next();
}
