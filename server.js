const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./server/config/database');
const apiRoutes = require('./server/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'server/uploads')));

// API routes
app.use('/api', apiRoutes);

// View routes for clean navigation
app.get('/organizer/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/views/organizer-login.html'));
});

app.get('/organizer/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/views/organizer-dashboard.html'));
});

// Attendee Flow routes (Single-Page App / Multi-screen experience)
app.get('/ticket/:ticketCode', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/views/ticket.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/views/index.html'));
});

// Start Server & Ensure DB Connection
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(` Concert Ticketing System is LIVE on port ${PORT}`);
      console.log(` Attendee Portal:  http://localhost:${PORT}`);
      console.log(` Organizer Login:  http://localhost:${PORT}/organizer/login`);
      console.log(` Organizer Portal: http://localhost:${PORT}/organizer/dashboard`);
      console.log(`=================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
