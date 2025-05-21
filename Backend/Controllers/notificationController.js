const Notification = require('../Models/Notification');

// Get all notifications for the current user
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination info
    const totalCount = await Notification.countDocuments({
      $or: [
        { recipient: userId },
        { recipientRole: userRole }
      ]
    });
    
    // Find notifications with pagination
    const notifications = await Notification.find({
      $or: [
        { recipient: userId },
        { recipientRole: userRole }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    res.status(200).json({
      notifications,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit)
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
    const notification = await Notification.findById(notificationId);
    
    notification.isRead = true;
    await notification.save();
    
    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const result = await Notification.updateMany(
      {},
      { $set: { isRead: true } } 
    );
    
    res.status(200).json({ 
      modifiedCount: result.nModified
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

      await Notification.deleteOne({ _id: notificationId });
  
      res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  