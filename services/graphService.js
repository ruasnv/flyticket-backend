const Flight = require('../models/Flight');
require('../models/City'); // Ensure City model is registered for population

const MIN_LAYOVER_MS = 45 * 60 * 1000;      // 45 minutes
const MAX_LAYOVER_MS = 6 * 60 * 60 * 1000;  // 6 hours

/**
 * Find all direct flights matching from/to/date
 */
async function findDirectFlights(fromCityId, toCityId, date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return Flight.find({
    from_city: fromCityId,
    to_city: toCityId,
    departure_time: { $gte: start, $lte: end },
    seats_available: { $gt: 0 }
  }).populate('from_city to_city');
}

/**
 * Find connected flights (2-leg journeys) for a given date.
 * Istanbul → X → Ankara, where layover is between 45min and 6h.
 */
async function findConnectedFlights(fromCityId, toCityId, date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  // Leg 1: all flights departing from origin on this date
  const leg1Flights = await Flight.find({
    from_city: fromCityId,
    departure_time: { $gte: start, $lte: end },
    seats_available: { $gt: 0 }
  }).populate('from_city to_city');

  // Leg 2: all flights arriving at destination on this date
  const leg2Flights = await Flight.find({
    to_city: toCityId,
    departure_time: { $gte: start, $lte: end },
    seats_available: { $gt: 0 }
  }).populate('from_city to_city');

  const connections = [];

  for (const leg1 of leg1Flights) {
    // Skip if leg1 already goes directly to destination
    if (leg1.to_city._id.equals(toCityId)) continue;

    for (const leg2 of leg2Flights) {
      // Intermediate city must match
      if (!leg1.to_city._id.equals(leg2.from_city._id)) continue;

      const layover = leg2.departure_time - leg1.arrival_time;

      // Layover window check
      if (layover >= MIN_LAYOVER_MS && layover <= MAX_LAYOVER_MS) {
        connections.push({
          type: 'connected',
          leg1,
          leg2,
          layover_minutes: Math.round(layover / 60000),
          total_price: leg1.price + leg2.price,
          total_duration_minutes: Math.round(
            (leg2.arrival_time - leg1.departure_time) / 60000
          )
        });
      }
    }
  }

  return connections;
}

module.exports = { findDirectFlights, findConnectedFlights };