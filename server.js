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
// CORS configuration to allow requests from the frontend
app.use(cors({
  origin: true,
  credentials: true
}));
// Middleware to parse JSON bodies in incoming requests
app.use(express.json());
// Serve static files from the frontend build directory
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));
// Session configuration for admin authentication and user login
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

// Endpoint to get all cities, sorted by city_id in ascending 
// order for dropdowns and selection in the frontend
app.get('/api/cities', async (req, res) => {
  try {
    const cities = await City.find().sort({ city_id: 1 });
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API routes for flights, tickets, admin, and user operations
app.use('/api/flights', flightRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/users',   userRoutes);

// Health check endpoint to verify that the API is running
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