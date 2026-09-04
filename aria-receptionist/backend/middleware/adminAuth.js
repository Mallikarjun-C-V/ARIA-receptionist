const jwt = require('jsonwebtoken');

module.exports = function adminAuth(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorised — no token' });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorised — invalid or expired token' });
  }
};
