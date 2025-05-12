const express = require('express');
const { punchIn, punchOut, startBreak, endBreak, getAttendanceHistory ,getUserAttendanceLogs,getUserAttendanceByDateRange,getManagedEmployeesAttendance,getAllEmployeesAttendance} = require('../Controllers/attendanceController.js');
const authMiddleware = require('../Middlewares/authMiddleware.js');
const roleMiddleware = require('../Middlewares/roleMiddleware.js');

const router = express.Router();


router.post('/punch-in/:userId', authMiddleware, punchIn);

router.post('/punch-out/:userId', authMiddleware, punchOut);

router.post('/break/start/:userId', authMiddleware, startBreak);

router.post('/break/end/:userId', authMiddleware, endBreak);

router.get('/history/:userId', authMiddleware, getAttendanceHistory);

// Get attendance logs for a user within a date range
router.get('/date-range/:userId', authMiddleware,roleMiddleware(['employee']),getUserAttendanceByDateRange);

// Get attendance for all employees managed by a manager
router.get('/managed/:managerId', authMiddleware, roleMiddleware(['manager']),getManagedEmployeesAttendance);

// Get attendance for all employees
router.get('/all', authMiddleware, roleMiddleware(['admin','superAdmin']), getAllEmployeesAttendance);

module.exports = router;