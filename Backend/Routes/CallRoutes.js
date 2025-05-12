const express = require('express');
const router = express.Router();
const callController = require('../Controllers/CallController');
const authMiddleware = require('../Middlewares/authMiddleware.js');

// Initiate a call
router.post('/initiate', authMiddleware, callController.initiateCall);

// Get call status
router.get('/:callId/status', authMiddleware, callController.getCallStatus);

// End a call
router.post('/:callId/end', authMiddleware, callController.endCall);

// Get ICE servers configuration
router.get('/ice-servers', authMiddleware, callController.getIceServers);

// Update call type (audio/video)
router.put('/:callId/type', authMiddleware, callController.updateCallType);



module.exports = router;