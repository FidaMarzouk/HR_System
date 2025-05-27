// Routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../Controllers/notificationController');
const authMiddleware = require('../Middlewares/authMiddleware');

// Get all notifications for current user
router.get('/', authMiddleware , notificationController.getUserNotifications);

// Mark notification as read
router.put('/:id/read', authMiddleware , notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', authMiddleware , notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', authMiddleware,notificationController.deleteNotification);

module.exports = router;