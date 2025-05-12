const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const authMiddleware = require('../Middlewares/authMiddleware');

// Existing routes
router.post('/login', authController.login);

// Add these new routes
router.post('/logout', authController.logout);

// Use the middleware to verify the token and then call the controller function
router.get('/verify', authMiddleware, authController.verifyToken);

router.post('/forgot-password', authController.requestPasswordReset);
router.get('/reset-password/:token', authController.verifyResetToken);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;