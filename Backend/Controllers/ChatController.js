const ChatMessage = require('../Models/TeamChat');
const User = require('../Models/User'); // Add the missing import for User model
const mongoose = require('mongoose');
const { getIO } = require('../Middlewares/notificationService');

// Send a new message
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user.id;
    
    if (!receiverId || !message) {
      return res.status(400).json({ message: 'Receiver ID and message are required' });
    }
    
    // Create and save the message
    const newMessage = new ChatMessage({
      sender: senderId,
      receiver: receiverId,
      message,
      isRead: false
    });
    
    await newMessage.save();
    
    // Populate sender and receiver info
    const populatedMessage = await ChatMessage.findById(newMessage._id)
      .populate('sender', 'firstName lastName picture role')
      .populate('receiver', 'firstName lastName picture role');
    
    // Emit the message to both sender and receiver via socket
    const io = getIO();
    if (io) {
      io.to(receiverId).emit('newMessage', populatedMessage);
      io.to(senderId).emit('newMessage', populatedMessage);
    }
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { senderId } = req.body;
    const receiverId = req.user.id;
    
    if (!senderId) {
      return res.status(400).json({ message: 'Sender ID is required' });
    }
    
    // Update all unread messages from the sender to the current user
    const result = await ChatMessage.updateMany(
      { sender: senderId, receiver: receiverId, isRead: false },
      { isRead: true }
    );
    
    // Notify the sender that their messages have been read
    const io = getIO();
    if (io) {
      io.to(senderId).emit('messagesRead', { userId: receiverId });
    }
    
    res.status(200).json({ updated: result.modifiedCount });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;
    
    if (!otherUserId) {
      return res.status(400).json({ message: 'User ID parameter is required' });
    }
    
    const messages = await ChatMessage.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId, deletedForSender: false },
        { sender: otherUserId, receiver: currentUserId, deletedForReceiver: false }
      ]
    }).sort({ createdAt: 1 })
    .populate('sender', 'firstName lastName picture role')
    .populate('receiver', 'firstName lastName picture role');
    
    // Mark messages as read in one operation
    const updateResult = await ChatMessage.updateMany(
      { sender: otherUserId, receiver: currentUserId, isRead: false },
      { isRead: true }
    );
    
    // Only emit if messages were actually marked as read
    if (updateResult.modifiedCount > 0) {
      const io = getIO();
      if (io) {
        io.to(otherUserId).emit('messagesRead', { userId: currentUserId });
      }
    }
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a single message
exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user.id;
    
    if (!messageId) {
      return res.status(400).json({ message: 'Message ID is required' });
    }
    
    // Find the message and ensure the user is authorized to delete it
    const message = await ChatMessage.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if the user is either the sender or receiver
    if (message.sender.toString() !== userId && message.receiver.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    
    // Mark the message as deleted for the specific user instead of deleting it
    const updateData = {};
    if (message.sender.toString() === userId) {
      updateData.deletedForSender = true;
    } else {
      updateData.deletedForReceiver = true;
    }
    
    await ChatMessage.findByIdAndUpdate(messageId, updateData);
    
    // Notify both users about the deleted message
    const io = getIO();
    if (io) {
      io.to(userId).emit('messageDeleted', { messageId });
      // Also notify the other user if they're connected
      const otherUserId = message.sender.toString() === userId ? message.receiver.toString() : message.sender.toString();
      io.to(otherUserId).emit('messageDeleted', { messageId });
    }
    
    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete entire conversation
exports.deleteConversation = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const userId = req.user.id;
    
    if (!otherUserId) {
      return res.status(400).json({ message: 'User ID parameter is required' });
    }
    
    // Delete all messages between these two users
    const result = await ChatMessage.deleteMany({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    });
    
    // Notify both users about the deleted conversation
    const io = getIO();
    if (io) {
      io.to(userId).emit('conversationDeleted', { userId: otherUserId });
      io.to(otherUserId).emit('conversationDeleted', { userId });
    }
    
    res.status(200).json({ 
      message: 'Conversation deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Optimized getConversations function with proper error handling
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    // Convert userId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Use aggregation to get all conversation data in a single query
    const conversationsData = await ChatMessage.aggregate([
      // Match messages where the current user is either sender or receiver
      {
        $match: {
          $or: [
            { sender: userObjectId },
            { receiver: userObjectId }
          ]
        }
      },
      // Determine the conversation partner for each message
      {
        $project: {
          message: 1,
          createdAt: 1,
          isRead: 1,
          partnerId: {
            $cond: [
              { $eq: ["$sender", userObjectId] },
              "$receiver",
              "$sender"
            ]
          },
          // Flag to identify if the message is sent to the current user and unread
          isUnread: {
            $and: [
              { $eq: ["$receiver", userObjectId] },
              { $eq: ["$isRead", false] }
            ]
          }
        }
      },
      // Group by conversation partner
      {
        $group: {
          _id: "$partnerId",
          lastMessage: { $last: "$message" },
          lastMessageDate: { $max: "$createdAt" },
          unreadCount: { 
            $sum: { $cond: ["$isUnread", 1, 0] }
          },
          messageCount: { $sum: 1 }
        }
      },
      // Sort by most recent message
      {
        $sort: { lastMessageDate: -1 }
      },
      // Lookup partner user details
      {
        $lookup: {
          from: "users", // This should match your User collection name
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      // Unwind the userDetails array to get a single object
      {
        $unwind: "$userDetails"
      },
      // Shape the final output
      {
        $project: {
          _id: 1,
          userId: "$_id",
          firstName: "$userDetails.firstName",
          lastName: "$userDetails.lastName",
          picture: "$userDetails.picture",
          role: "$userDetails.role",
          lastMessage: 1,
          lastMessageDate: 1,
          unreadCount: 1,
          messageCount: 1
        }
      }
    ]);
    
    res.json(conversationsData);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUnreadMessagesCount = async (req, res) => {
  try {
    const userId = req.user.id;
    // Convert userId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Aggregate to get the sum of unread messages across all conversations
    const result = await ChatMessage.aggregate([
      // Match only messages sent to the current user that are unread
      {
        $match: {
          receiver: userObjectId,
          isRead: false
        }
      },
      // Count the total unread messages
      {
        $group: {
          _id: null,
          totalUnread: { $sum: 1 }
        }
      }
    ]);
    
    // Return 0 if no unread messages found
    const unreadCount = result.length > 0 ? result[0].totalUnread : 0;
    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread messages count:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};