import jwt from 'jsonwebtoken';

export function requireWriteAccess (req, res, next) {
  const adminKey = process.env.TRIP_ADMIN_KEY;
  const headerKey = req.get('x-trip-admin-key');

  if (adminKey && headerKey === adminKey) {
    next();
    return;
  }

  const token = req.cookies?.tripToken;
  if (token && process.env.JWT_SECRET) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
      return;
    } catch {
      // Continua al 401 homogeneo.
    }
  }

  res.status(401).json({ message: 'No autorizado' });
}
