const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');
const Ticket = require('../models/Ticket');
const authGuard = require('../middleware/authGuard');
const { findDirectFlights, findConnectedFlights } = require('../services/graphService');

// Helper: check scheduling rules
async function validateFlightRules(from_city, to_city, departure_time, arrival_time, excludeId = null) {
  const errors = [];

  if (from_city.toString() === to_city.toString()) {
    errors.push('Departure and arrival cities cannot be the same.');
  }

  const dep = new Date(departure_time);
  const arr = new Date(arrival_time);

  if (isNaN(dep.getTime()) || isNaN(arr.getTime())) {
    errors.push('Invalid departure or arrival time.');
    return errors; // stop here, further checks will fail
  }

  if (arr <= dep) {
    errors.push(`Arrival time (${arr.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}) must be after departure time (${dep.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}).`);
  }

  const depHourStart = new Date(dep); depHourStart.setMinutes(0, 0, 0);
  const depHourEnd   = new Date(dep); depHourEnd.setMinutes(59, 59, 999);
  const arrHourStart = new Date(arr); arrHourStart.setMinutes(0, 0, 0);
  const arrHourEnd   = new Date(arr); arrHourEnd.setMinutes(59, 59, 999);

  const exclude = excludeId ? { _id: { $ne: excludeId } } : {};

  const depConflict = await Flight.findOne({
    ...exclude,
    from_city,
    departure_time: { $gte: depHourStart, $lte: depHourEnd }
  }).populate('from_city');

  if (depConflict) {
    errors.push(`Flight ${depConflict.flight_id} already departs from ${depConflict.from_city.city_name} at ${dep.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}. No two flights can depart from the same city in the same hour.`);
  }

  const arrConflict = await Flight.findOne({
    ...exclude,
    to_city,
    arrival_time: { $gte: arrHourStart, $lte: arrHourEnd }
  }).populate('to_city');

  if (arrConflict) {
    errors.push(`Flight ${arrConflict.flight_id} already arrives at ${arrConflict.to_city.city_name} at ${arr.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}. No two flights can arrive at the same city in the same hour.`);
  }

  return errors;
}

// GET /api/flights - list all flights
router.get('/', async (req, res) => {
  try {
    const flights = await Flight.find().populate('from_city to_city');
    res.json(flights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/flights/search?from=&to=&date=&connected=true
router.get('/search', async (req, res) => {
  try {
    const { from, to, date, connected } = req.query;
    if (!from || !to || !date) {
      return res.status(400).json({ error: 'from, to, and date are required.' });
    }

    const direct = await findDirectFlights(from, to, date);
    const result = { direct };

    if (connected === 'true') {
      result.connected = await findConnectedFlights(from, to, date);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/flights/:id/seats - get taken seats for a flight
router.get('/:id/seats', async (req, res) => {
  try {
    const tickets = await Ticket.find({ flight_id: req.params.id });
    const takenSeats = tickets.map(t => t.seat_number);
    res.json({ takenSeats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/flights/:id - single flight
router.get('/:id', async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id).populate('from_city to_city');
    if (!flight) return res.status(404).json({ error: 'Flight not found.' });
    res.json(flight);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/flights - create flight (admin only)
router.post('/', authGuard, async (req, res) => {
  try {
    const { flight_id, from_city, to_city, departure_time, arrival_time, price, seats_total } = req.body;

    const errors = await validateFlightRules(from_city, to_city, departure_time, arrival_time);
    if (errors.length > 0) return res.status(400).json({ errors });

    const flight = new Flight({
      flight_id,
      from_city,
      to_city,
      departure_time,
      arrival_time,
      price,
      seats_total,
      seats_available: seats_total
    });

    await flight.save();
    res.status(201).json(flight);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      const value = err.keyValue[field];
      return res.status(400).json({ 
        errors: [`A flight with ${field} "${value}" already exists. Please use a unique Flight ID.`] 
      });
    }
    res.status(500).json({ error: err.message });
  }});

// PUT /api/flights/:id - update flight (admin only)
router.put('/:id', authGuard, async (req, res) => {
  try {
    const { from_city, to_city, departure_time, arrival_time, price, seats_total } = req.body;

    const errors = await validateFlightRules(from_city, to_city, departure_time, arrival_time, req.params.id);
    if (errors.length > 0) return res.status(400).json({ errors });

    const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!flight) return res.status(404).json({ error: 'Flight not found.' });
    res.json(flight);
   } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        return res.status(400).json({
          errors: [`A flight with ${field} "${value}" already exists. Please use a unique Flight ID.`]
        });
      }
      res.status(500).json({ error: err.message });
    }
});

// DELETE /api/flights/:id - delete flight (admin only)
router.delete('/:id', authGuard, async (req, res) => {
  try {
    const flight = await Flight.findByIdAndDelete(req.params.id);
    if (!flight) return res.status(404).json({ error: 'Flight not found.' });
    res.json({ message: 'Flight deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;