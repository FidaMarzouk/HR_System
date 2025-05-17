const socketIO = require('socket.io');
const Notification = require('../Models/Notification');
const jwt = require('jsonwebtoken');
const verifyToken = require('../utils/jwtVerify');
let io;

// Initialize Socket.IO with the HTTP server
const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }
  });

io.use((socket, next) => {
  try {
    // Extract cookie from handshake headers
    const cookies = socket.handshake.headers.cookie;
    if (!cookies) {
      return next(new Error('Authentication error: No cookies provided'));
    }

    // Parse cookies to find authToken
    const cookieArray = cookies.split(';');
    let authToken = null;
    
    for (const cookie of cookieArray) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'authToken') {
        authToken = value;
        break;
      }
    }

    if (!authToken) {
      return next(new Error('Authentication error: Auth token not found in cookies'));
    }

    // Verify the token
    const result = verifyToken(authToken);
    
    if (!result.success) {
      if (result.error.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      } else {
        console.error(`JWT Error (${result.error.name}): ${result.error.message}`);
        return next(new Error('Authentication error: Invalid token'));
      }
    }
    
    socket.user = result.user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: ' + error.message));
  }
});

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Automatically join personal and role rooms
    const userId = socket.user.id;
    const userRole = socket.user.role;
    
    // Join personal room
    socket.join(userId);
    console.log(`User ${userId} joined personal room`);
    
    // Join role room if available
    if (userRole) {
      socket.join(userRole);
      console.log(`User joined ${userRole} room`);
    }
    
    // Handle marking messages as read
    socket.on('messagesRead', async (data) => {
      try {
        const { userId } = data;
        console.log(`Messages to ${userId} marked as read`);
        
        // Update notifications as read in database
        // Consider adding code here if you need to mark messages as read in DB
      } catch (error) {
        console.error('Error in messagesRead socket handler:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Send notification to specific user
const sendNotificationToUser = async (userId, notification) => {
  try {
    // Save notification to database
    const newNotification = new Notification({
      recipient: userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      relatedId: notification.relatedId,
      isRead: false
    });
    await newNotification.save();
    
    // Emit to specific user
    if (io) {
      io.to(userId).emit('notification', newNotification);
    }
    return newNotification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

// Send notification to all users with a specific role
const sendNotificationToRole = async (role, notification) => {
  try {
    // For role-based notifications, we create one record but broadcast to many
    const newNotification = new Notification({
      recipientRole: role,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      relatedId: notification.relatedId,
      isRead: false
    });
    await newNotification.save();
    
    // Emit to role room
    if (io) {
      io.to(role).emit('notification', newNotification);
    }
    return newNotification;
  } catch (error) {
    console.error('Error sending role notification:', error);
    throw error;
  }
};

module.exports = {
  initializeSocket,
  sendNotificationToUser,
  sendNotificationToRole,
  getIO: () => io
};