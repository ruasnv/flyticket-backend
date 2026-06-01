const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Flight = require('../models/Flight');
// v4 is used for random UUID generation, which is suitable for ticket IDs
const { v4: uuidv4 } = require('uuid');

// POST /api/tickets - book a ticket
// This takes passenger details and flight_id, checks for seat availability,
// and creates a ticket if possible. It also decrements the available seats on
// the flight.
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

   // Validate and assign seat number
   // Get all booked seats for this flight to check against
    const bookedSeats = await Ticket.find({ flight_id }); 
   // Extract seat numbers from booked tickets
    const takenSeats  = bookedSeats.map(t => t.seat_number);

    let seat_number = req.body.seat_number;
    // check if seat is already taken
    if (seat_number && takenSeats.includes(seat_number)) {
      return res.status(400).json({ error: `Seat ${seat_number} is already taken. Please select another.` });
    }
    if (!seat_number) {
      // Auto-assign if none selected
      const idx = flight.seats_total - flight.seats_available;
      // Simple seat assignment logic: A1, A2, ..., F6 for 36 seats
      seat_number = `${String.fromCharCode(65 + Math.floor(idx / 6))}${(idx % 6) + 1}`;
    }

    const ticket = new Ticket({
      ticket_id: uuidv4(),
      passenger_name,
      passenger_surname,
      passenger_email,
      flight_id,
      seat_number,
      user_id: req.session?.userId || null
    });
    // Save the ticket
    await ticket.save();

    // Decrement available seats
    flight.seats_available -= 1;
    await flight.save();

    // Return ticket with flight details populated
    const populated = await ticket.populate({
      path: 'flight_id',
      populate: { path: 'from_city to_city' }
    });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:email - get tickets by email
// This endpoint allows users to retrieve their tickets using their email address.
// It returns all tickets associated with the provided email, along with the flight details for each ticket.
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