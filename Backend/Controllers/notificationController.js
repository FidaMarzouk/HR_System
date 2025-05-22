const Notification = require('../Models/Notification');

// Get all notifications for the current user
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const filter = req.query.filter; // 'read', 'unread', or undefined for all

    // Build the base query
    let baseQuery = {
      $or: [
        { recipient: userId },
        { recipientRole: userRole }
      ]
    };

    // Add filter condition
    if (filter === 'read') {
      baseQuery.isRead = true;
    } else if (filter === 'unread') {
      baseQuery.isRead = false;
    }

    // If no pagination parameters are provided, return all notifications
    if (!page && !limit) {
      const notifications = await Notification.find(baseQuery)
        .sort({ createdAt: -1 });
      return res.status(200).json(notifications);
    }

    // If pagination parameters are provided, use pagination
    const pageNum = page || 1;
    const pageSize = limit || 10;
    const skip = (pageNum - 1) * pageSize;

    const totalCount = await Notification.countDocuments(baseQuery);

    const notifications = await Notification.find(baseQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    res.status(200).json({
      notifications,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / pageSize)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;  
    // Find and update the notification
    const notification = await Notification.findById(notificationId);

    // Update notification
    notification.isRead = true;
    await notification.save();
    
    // Emit socket event to ALL user's connected clients
    const io = req.app.get('io');
    if (io) {
      const roomName = userId;
      const sockets = await io.in(roomName).fetchSockets();
      
      if (sockets.length > 0) {
        io.to(roomName).emit('notificationUpdate', {
          id: notificationId,
          type: 'read',
          data: { isRead: true }
        });
      }
    } 
    res.status(200).json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // FIXED: Add proper filter to only update user's notifications
    const result = await Notification.updateMany(
      {
        $or: [
          { recipient: userId },
          { recipientRole: userRole }
        ],
        isRead: false // Only update unread notifications
      },
      { $set: { isRead: true } }
    );

    // Emit socket event to all user's connected clients
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notificationUpdate', {
        type: 'readAll',
        data: { modifiedCount: result.modifiedCount }
      });
    }

    res.status(200).json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    // Delete the notification
    await Notification.deleteOne({ _id: notificationId });

    // Emit socket event to all user's connected clients
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notificationUpdate', {
        id: notificationId,
        type: 'delete'
      });
    }

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};