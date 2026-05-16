const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const authGuard = require('../middleware/authGuard');
const Ticket = require('../models/Ticket');
const Flight = require('../models/Flight');


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

// GET /api/admin/me - check session
router.get('/me', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ isAdmin: true, username: req.session.username });
  }
  res.json({ isAdmin: false });
});


// POST /api/admin/logout
router.post('/logout', authGuard, (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/admin/tickets — view all bookings
router.get('/tickets', authGuard, async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate({ path: 'flight_id', populate: { path: 'from_city to_city' } })
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/tickets/:id — admin cancels any booking
router.delete('/tickets/:id', authGuard, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    // Restore seat
    await Flight.findByIdAndUpdate(ticket.flight_id, { $inc: { seats_available: 1 } });
    await ticket.deleteOne();

    res.json({ message: 'Booking cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;