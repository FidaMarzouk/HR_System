const express = require('express');
const router = express.Router();
const chatController = require('../Controllers/ChatController');
const authMiddleware = require('../Middlewares/authMiddleware.js');

// Get all users for chat (excluding current user)
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const User = require('../Models/User');
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('firstName lastName role');
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Get all conversations for current user
router.get('/conversations', authMiddleware, chatController.getConversations);

// Get messages between current user and another user
router.get('/messages/:userId', authMiddleware, chatController.getMessages);

// Send a new message
router.post('/messages', authMiddleware, chatController.sendMessage);

// Mark messages as read
router.put('/messages/read', authMiddleware, chatController.markAsRead);

// Delete a single message
router.delete('/messages/:messageId', authMiddleware, chatController.deleteMessage);

// Delete entire conversation
router.delete('/conversations/:userId', authMiddleware, chatController.deleteConversation);

router.get('/unread', authMiddleware, chatController.getUnreadMessagesCount);

module.exports = router;