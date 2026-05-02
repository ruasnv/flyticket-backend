const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');
const authGuard = require('../middleware/authGuard');
const { findDirectFlights, findConnectedFlights } = require('../services/graphService');

// Helper: check scheduling rules
async function validateFlightRules(from_city, to_city, departure_time, arrival_time, excludeId = null) {
  const errors = [];

  // Same city check
  if (from_city.toString() === to_city.toString()) {
    errors.push('Departure and arrival city cannot be the same.');
  }

  // Arrival must be after departure
  if (new Date(arrival_time) <= new Date(departure_time)) {
    errors.push('Arrival time must be after departure time.');
  }

  const depHourStart = new Date(departure_time);
  depHourStart.setMinutes(0, 0, 0);
  const depHourEnd = new Date(departure_time);
  depHourEnd.setMinutes(59, 59, 999);

  const arrHourStart = new Date(arrival_time);
  arrHourStart.setMinutes(0, 0, 0);
  const arrHourEnd = new Date(arrival_time);
  arrHourEnd.setMinutes(59, 59, 999);

  // Build exclude filter for updates
  const exclude = excludeId ? { _id: { $ne: excludeId } } : {};

  // Rule: no two flights depart from same city in same hour
  const depConflict = await Flight.findOne({
    ...exclude,
    from_city,
    departure_time: { $gte: depHourStart, $lte: depHourEnd }
  });
  if (depConflict) {
    errors.push(`A flight already departs from this city at this hour (${depConflict.flight_id}).`);
  }

  // Rule: no two flights arrive at same city in same hour
  const arrConflict = await Flight.findOne({
    ...exclude,
    to_city,
    arrival_time: { $gte: arrHourStart, $lte: arrHourEnd }
  });
  if (arrConflict) {
    errors.push(`A flight already arrives at this city at this hour (${arrConflict.flight_id}).`);
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
    res.status(500).json({ error: err.message });
  }
});

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