const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const authGuard = require('../middleware/authGuard');

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });

    const match = await admin.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    req.session.isAdmin = true;
    req.session.username = admin.username;
    res.json({ message: 'Login successful.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/logout
router.post('/logout', authGuard, (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/admin/me - check session
router.get('/me', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ isAdmin: true, username: req.session.username });
  }
  res.json({ isAdmin: false });
});

module.exports = router;