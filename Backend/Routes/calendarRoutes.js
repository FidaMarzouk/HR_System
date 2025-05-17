const express = require('express');
const { 
  getEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent,
  updateAttendeeStatus,
  adminReviewEvent,
  getResources,
  getResourceById,
  getUsersInvolved,
  getResourceTypes
} = require('../Controllers/calendarController.js');
const authMiddleware = require('../Middlewares/authMiddleware.js');
const roleMiddleware = require('../Middlewares/roleMiddleware.js');

const router = express.Router();

// Get events (can be filtered with query params)
router.get('/events', authMiddleware, getEvents);

// Create a new event for a user
router.post('/event/:userId', authMiddleware, createEvent);

// Get, update, delete specific event
router.put('/event/:eventId/:userId', authMiddleware, updateEvent);
router.delete('/event/:eventId/:userId', authMiddleware, deleteEvent);

// Update attendee status for an event
router.put('/event/:eventId/attendee/:userId', authMiddleware, updateAttendeeStatus);

// Admin review (approve/decline) an event
router.put('/event/:eventId/admin-review/:adminId/:status', authMiddleware, roleMiddleware(['admin']), adminReviewEvent);

router.get('/resources', getResources);

router.get('/resources/:id', getResourceById);

router.get('/types', authMiddleware, getResourceTypes);

router.get('/', getUsersInvolved);

module.exports = router;