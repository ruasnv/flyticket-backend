const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
// We need authGuard to protect admin routes, but we won't use it for login
const authGuard = require('../middleware/authGuard');
const Ticket = require('../models/Ticket');
const Flight = require('../models/Flight');


// POST /api/admin/login
// Admin login route (no authGuard here since it's for logging in)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Find admin by username
    const admin = await Admin.findOne({ username });
    // If admin not found or password doesn't match, return error
    if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });
    
    // Compare password using the method defined in Admin model
    const match = await admin.comparePassword(password);
    // If password doesn't match, return error
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    // If credentials are valid, set session variables
    req.session.isAdmin = true;
    req.session.username = admin.username;
    // Return success message
    res.json({ message: 'Login successful.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/me - check session
// This route is used by the frontend to check if the admin is logged in and get their username
router.get('/me', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ isAdmin: true, username: req.session.username });
  }
  res.json({ isAdmin: false });
});


// POST /api/admin/logout
// Admin logout route, used for destroying the session and logging out the admin
// Uses authGuard to ensure only logged-in admins can access this route
router.post('/logout', authGuard, (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/admin/tickets — view all bookings
// This route allows the admin to view all ticket bookings, with flight details populated
// Uses authGuard to ensure only logged-in admins can access this route
router.get('/tickets', authGuard, async (req, res) => {
  try {
    // Find all tickets and populate flight details (including from_city and to_city)
    const tickets = await Ticket.find()
      // First populate the flight_id field to get flight details 
      .populate({ path: 'flight_id', populate: { path: 'from_city to_city' } })
      // Sort tickets by creation date in descending order (newest first)
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/tickets/:id — admin cancels any booking
// This route allows the admin to cancel any booking by ticket ID, restoring the seat availability for the associated flight
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