import jwt from 'jsonwebtoken';

export function me (req, res) {
  const token = req.cookies?.tripToken;
  if (!token || !process.env.JWT_SECRET) {
    res.json({ authenticated: false });
    return;
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ authenticated: true, user });
  } catch {
    res.json({ authenticated: false });
  }
}

export function login (req, res) {
  const { adminKey } = req.body || {};
  if (!process.env.TRIP_ADMIN_KEY || adminKey !== process.env.TRIP_ADMIN_KEY) {
    res.status(401).json({ message: 'Credenciales invalidas' });
    return;
  }

  const token = jwt.sign({ username: 'admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.cookie('tripToken', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
  res.json({ authenticated: true, user: { username: 'admin', role: 'admin' } });
}

export function logout (_req, res) {
  res.clearCookie('tripToken');
  res.json({ authenticated: false });
}
