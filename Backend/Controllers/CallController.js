const { getIO } = require('../Middlewares/notificationService');
const uuid = require('uuid');

// Track active calls
const activeCalls = new Map();

// Initialize call controller
exports.initializeCallController = () => {
  console.log('Call controller initialized');
};

// Initiate a call
exports.initiateCall = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const callerId = req.user.id;
    
    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID is required' });
    }
    
    // Generate a unique call ID
    const callId = uuid.v4();
    
    // Store call information
    activeCalls.set(callId, {
      callId,
      callerId,
      receiverId,
      status: 'initiating',
      startTime: new Date(),
      type: 'audio'
    });
    
    // Notify the receiver about the incoming call
    const io = getIO();
    if (io) {
      io.to(receiverId).emit('incomingCall', {
        callId,
        callerId,
        callerName: `${req.user.firstName} ${req.user.lastName}`,
        callerPicture: req.user.picture || '',
        type: 'audio'
      });
    }
    
    res.status(200).json({ 
      success: true,
      callId,
      message: 'Call initiated'
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
};

// Get call status
exports.getCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;
    
    if (!callId || !activeCalls.has(callId)) {
      return res.status(404).json({ 
        success: false,
        message: 'Call not found'
      });
    }
    
    const callInfo = activeCalls.get(callId);
    
    res.status(200).json({
      success: true,
      callInfo: {
        callId,
        status: callInfo.status,
        startTime: callInfo.startTime,
        type: callInfo.type
      }
    });
  } catch (error) {
    console.error('Error getting call status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
};

// Get STUN/TURN servers configuration
exports.getIceServers = async (req, res) => {
  try {
    // For production, consider using a service like Twilio for TURN servers
    // or set up your own TURN server
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ];
    
    res.status(200).json({
      success: true,
      iceServers
    });
  } catch (error) {
    console.error('Error getting ICE servers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
};

// Setup socket handlers for call functionality
exports.setupCallSocketHandlers = (socket) => {
  const userId = socket.handshake.auth.userId;
  
  // Handle call acceptance
  socket.on('acceptCall', ({ callId }) => {
    if (activeCalls.has(callId)) {
      const callInfo = activeCalls.get(callId);
      callInfo.status = 'active';
      activeCalls.set(callId, callInfo);
      
      const io = getIO();
      if (io) {
        io.to(callInfo.callerId).emit('callAccepted', { 
          callId,
          receiverId: callInfo.receiverId
        });
      }
      
      console.log(`Call ${callId} accepted by user ${userId}`);
    }
  });
  
  // Handle call rejection
  socket.on('rejectCall', ({ callId, reason = 'declined' }) => {
    if (activeCalls.has(callId)) {
      const callInfo = activeCalls.get(callId);
      
      const io = getIO();
      if (io) {
        io.to(callInfo.callerId).emit('callRejected', { 
          callId, 
          reason 
        });
      }
      
      activeCalls.delete(callId);
      console.log(`Call ${callId} rejected by user ${userId}: ${reason}`);
    }
  });
  
  // Handle WebRTC signaling
  socket.on('iceCandidate', ({ callId, candidate, targetId }) => {
    const io = getIO();
    if (io && targetId) {
      io.to(targetId).emit('iceCandidate', { 
        callId, 
        candidate,
        from: userId
      });
    }
  });
  
  socket.on('offer', ({ callId, offer, targetId }) => {
    const io = getIO();
    if (io && targetId) {
      io.to(targetId).emit('offer', { 
        callId, 
        offer,
        from: userId
      });
    }
  });
  
  socket.on('answer', ({ callId, answer, targetId }) => {
    const io = getIO();
    if (io && targetId) {
      io.to(targetId).emit('answer', { 
        callId, 
        answer,
        from: userId
      });
    }
  });
  
  // Handle call end
  socket.on('endCall', ({ callId }) => {
    if (activeCalls.has(callId)) {
      const callInfo = activeCalls.get(callId);
      
      const io = getIO();
      if (io) {
        io.to(callInfo.callerId).emit('callEnded', { callId });
        io.to(callInfo.receiverId).emit('callEnded', { callId });
      }
      
      // Calculate call duration
      const endTime = new Date();
      const callDuration = (endTime - callInfo.startTime) / 1000; // duration in seconds
      
      console.log(`Call ${callId} ended. Duration: ${callDuration} seconds`);
      
      // Remove call from active calls
      activeCalls.delete(callId);
    }
  });
  
  // Handle call not answered
  socket.on('callTimeout', ({ callId }) => {
    if (activeCalls.has(callId)) {
      const callInfo = activeCalls.get(callId);
      
      const io = getIO();
      if (io) {
        io.to(callInfo.callerId).emit('callNotAnswered', { callId });
        io.to(callInfo.receiverId).emit('missedCall', { 
          callId,
          callerId: callInfo.callerId
        });
      }
      
      activeCalls.delete(callId);
      console.log(`Call ${callId} timed out without answer`);
    }
  });
  
  // Handle mute/unmute status changes
  socket.on('muteStatusChange', ({ callId, isMuted, targetId }) => {
    const io = getIO();
    if (io && targetId) {
      io.to(targetId).emit('participantMuteChanged', {
        callId,
        userId,
        isMuted
      });
    }
  });
};

// End a call (HTTP endpoint version)
exports.endCall = async (req, res) => {
  try {
    const { callId } = req.params;
    
    if (!callId || !activeCalls.has(callId)) {
      return res.status(404).json({ 
        success: false,
        message: 'Call not found'
      });
    }
    
    const callInfo = activeCalls.get(callId);
    const userId = req.user.id;
    
    // Check if the user is a participant in the call
    if (callInfo.callerId !== userId && callInfo.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to end this call'
      });
    }
    
    const io = getIO();
    if (io) {
      io.to(callInfo.callerId).emit('callEnded', { callId });
      io.to(callInfo.receiverId).emit('callEnded', { callId });
    }
    
    // Calculate call duration
    const endTime = new Date();
    const callDuration = (endTime - callInfo.startTime) / 1000; // duration in seconds
    
    // Remove call from active calls
    activeCalls.delete(callId);
    
    res.status(200).json({
      success: true,
      message: 'Call ended successfully',
      callDuration
    });
  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
};

// Update call type (audio to video or vice versa)
exports.updateCallType = async (req, res) => {
  try {
    const { callId } = req.params;
    const { type } = req.body;
    const userId = req.user.id;
    
    if (!callId || !activeCalls.has(callId)) {
      return res.status(404).json({ 
        success: false,
        message: 'Call not found'
      });
    }
    
    const callInfo = activeCalls.get(callId);
    
    // Check if the user is a participant in the call
    if (callInfo.callerId !== userId && callInfo.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this call'
      });
    }
    
    // Update call type
    if (type === 'audio' || type === 'video') {
      callInfo.type = type;
      activeCalls.set(callId, callInfo);
      
      const io = getIO();
      const targetId = callInfo.callerId === userId ? callInfo.receiverId : callInfo.callerId;
      
      if (io) {
        io.to(targetId).emit('callTypeChanged', { 
          callId, 
          type,
          requestedBy: userId
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Call type updated',
        callInfo: {
          callId,
          type: callInfo.type
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid call type. Must be "audio" or "video"'
      });
    }
  } catch (error) {
    console.error('Error updating call type:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
};