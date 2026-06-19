import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'flip-secret-key-2024';
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, error: 'Authentication required' });
  try { const decoded = jwt.verify(token, JWT_SECRET); req.user = decoded; next(); }
  catch { return res.status(401).json({ success: false, error: 'Invalid or expired token' }); }
}
export function adminMiddleware(req, res, next) {
  if (req.user?.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ success: false, error: 'Admin access required' });
  next();
}
