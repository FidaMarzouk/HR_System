const express = require('express');
const router = express.Router();
const chatbotController = require('../Controllers/chatbot.controller');
const authMiddleware = require('../Middlewares/authMiddleware');

router.post('/message', authMiddleware, chatbotController.sendMessage);
router.get('/history', authMiddleware, chatbotController.getConversationHistory);

module.exports = router;