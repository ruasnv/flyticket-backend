const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Flight = require('../models/Flight');
const { v4: uuidv4 } = require('uuid');

// POST /api/tickets - book a ticket
router.post('/', async (req, res) => {
  try {
    const { passenger_name, passenger_surname, passenger_email, flight_id } = req.body;

    if (!passenger_name || !passenger_surname || !passenger_email || !flight_id) {
      return res.status(400).json({ error: 'All passenger fields and flight_id are required.' });
    }

    // Check flight exists and has seats
    const flight = await Flight.findById(flight_id).populate('from_city to_city');
    if (!flight) return res.status(404).json({ error: 'Flight not found.' });
    if (flight.seats_available <= 0) return res.status(400).json({ error: 'No seats available on this flight.' });

    // Assign seat number
    const seat_number = `${String.fromCharCode(65 + Math.floor((flight.seats_total - flight.seats_available) / 6))}${((flight.seats_total - flight.seats_available) % 6) + 1}`;

    const ticket = new Ticket({
      ticket_id: uuidv4(),
      passenger_name,
      passenger_surname,
      passenger_email,
      flight_id,
      seat_number
    });

    await ticket.save();

    // Decrement available seats
    flight.seats_available -= 1;
    await flight.save();

    // Return ticket with flight details populated
    const populated = await ticket.populate('flight_id');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:email - get tickets by email
router.get('/:email', async (req, res) => {
  try {
    const tickets = await Ticket.find({
      passenger_email: req.params.email
    }).populate({ path: 'flight_id', populate: { path: 'from_city to_city' } });

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;