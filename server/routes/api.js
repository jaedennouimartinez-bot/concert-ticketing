const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const botDetection = require('../middleware/botDetection');
const eventController = require('../controllers/eventController');
const ticketController = require('../controllers/ticketController');
const organizerController = require('../controllers/organizerController');

// Events
router.get('/events', eventController.getEvents);
router.get('/events/:slug', eventController.getEventBySlug);

// Attendee & Ticketing
router.post('/attendee/lookup', ticketController.lookupAccount);
router.post('/tickets/purchase', botDetection, upload.single('idDocument'), ticketController.purchaseTicket);
router.get('/tickets/:ticketCode', ticketController.getTicketByCode);

// Organizer Portal
router.post('/organizer/login', organizerController.login);
router.get('/organizer/dashboard', organizerController.getDashboard);
router.post('/organizer/revoke', organizerController.revokeTicket);

module.exports = router;
