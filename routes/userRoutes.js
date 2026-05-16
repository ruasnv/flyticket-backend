const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Ticket  = require('../models/Ticket');
const Flight  = require('../models/Flight');

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ error: 'An account with this email already exists.' });

    const user = new User({ name, email, password });
    await user.save();

    req.session.userId   = user._id;
    req.session.userName = user.name;
    res.status(201).json({ message: 'Account created.', name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    req.session.userId   = user._id;
    req.session.userName = user.name;
    res.json({ message: 'Login successful.', name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out.' });
});

// GET /api/users/me
router.get('/me', (req, res) => {
  if (req.session?.userId) {
    return res.json({ loggedIn: true, name: req.session.userName, id: req.session.userId });
  }
  res.json({ loggedIn: false });
});

// GET /api/users/tickets — get logged in user's tickets
router.get('/tickets', async (req, res) => {
  try {
    if (!req.session?.userId)
      return res.status(401).json({ error: 'Please log in to view your tickets.' });

    const tickets = await Ticket.find({ user_id: req.session.userId })
      .populate({ path: 'flight_id', populate: { path: 'from_city to_city' } })
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/tickets/:id — user cancels their own ticket
router.delete('/tickets/:id', async (req, res) => {
  try {
    if (!req.session?.userId)
      return res.status(401).json({ error: 'Please log in.' });

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      user_id: req.session.userId
    });

    if (!ticket)
      return res.status(404).json({ error: 'Ticket not found or not yours.' });

    // Restore seat
    await Flight.findByIdAndUpdate(ticket.flight_id, { $inc: { seats_available: 1 } });
    await ticket.deleteOne();

    res.json({ message: 'Ticket cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;