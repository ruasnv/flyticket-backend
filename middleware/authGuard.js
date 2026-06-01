// Middleware to protect admin routes from unauthorized access
const authguard = (req, res, next) => {
  // Check if the user is logged in and has admin privileges
  if (req.session && req.session.isAdmin) return next();
  // If not authorized, respond with a 401 Unauthorized status
  return res.status(401).json({ error: 'Unauthorized. Admin login required.' });
};

module.exports = authguard;