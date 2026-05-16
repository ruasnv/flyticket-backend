const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticket_id:         { type: String, required: true, unique: true },
  passenger_name:    { type: String, required: true },
  passenger_surname: { type: String, required: true },
  passenger_email:   { type: String, required: true },
  flight_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', required: true },
  seat_number:       { type: String },
  user_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);