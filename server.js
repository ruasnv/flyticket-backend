const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const flightRoutes = require('./routes/flightRoutes');
const ticketRoutes = require('./routes/ticketRoutes.js');
const adminRoutes  = require('./routes/adminRoutes');
const City = require('./models/City');
const userRoutes = require('./routes/userRoutes');
const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 2,
    sameSite: 'lax',
    secure: false
  }
}));

// Routes
app.get('/api/cities', async (req, res) => {
  try {
    const cities = await City.find().sort({ city_id: 1 });
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.use('/api/flights', flightRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/users',   userRoutes);

// Health check
app.get('/', (req, res) => res.json({ message: 'FlyTicket API is running' }));

// Connect to MongoDB then start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch(err => console.error('DB connection failed:', err));