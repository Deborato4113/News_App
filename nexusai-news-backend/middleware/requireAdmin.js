const User = require('../models/User');

// Must run after `auth` (needs req.user.id already set). Looks the role
// up fresh from the DB rather than trusting anything in the JWT, so a
// role change (or a revoked admin) takes effect immediately without
// waiting for the user's token to expire.
module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    req.user.role = user.role;
    next();
  } catch (err) { next(err); }
};
