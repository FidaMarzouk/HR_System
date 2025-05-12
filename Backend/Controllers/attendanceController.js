const Attendance = require('../Models/Attendance.js');
const User = require('../Models/User.js');
const LeaveRequest = require('../Models/LeaveRequest');

// Helper function to create time thresholds in UTC 
// that correspond to specific Tunisia time (UTC+1)
const createTunisiaTimeThreshold = (hour, minute) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Set to start of day in UTC
  
  // Create threshold in UTC time (subtract 1 hour from Tunisia time)
  const threshold = new Date(today);
  threshold.setUTCHours(hour - 1, minute, 0, 0);
  return threshold;
};

// Helper to get today's UTC day boundaries
const getTodayBoundaries = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return { today, tomorrow };
};

// Helper function to calculate production hours
const calculateProductionHours = async (attendanceRecord) => {
  try {
    // Only calculate if both check-in and check-out exist
    if (!attendanceRecord.checkIn || !attendanceRecord.checkOut) {
      return 0;
    }
    
    // Calculate total session time in minutes
    let totalMinutes = Math.max(0, (attendanceRecord.checkOut - attendanceRecord.checkIn) / (1000 * 60));
    
    // If check-in time equals check-out time, return 0
    if (totalMinutes === 0) {
      return 0;
    }
    
    // Calculate total break time in minutes
    const breakMinutes = attendanceRecord.breaks.reduce((total, breakPeriod) => {
      // Only count breaks that have both start and end times
      if (breakPeriod.startTime && breakPeriod.endTime) {
        return total + (breakPeriod.duration || 0);
      }
      return total;
    }, 0);
    
    // Subtract break time from total time
    const productiveMinutes = Math.max(0, totalMinutes - breakMinutes);
    
    // Convert to hours with 2 decimal places and ensure it's a number
    return Number((productiveMinutes / 60).toFixed(2));
  } catch (error) {
    console.error('Error calculating production hours:', error);
    return 0;
  }
};

// Helper function to update production hours in an attendance record
const updateProductionHours = async (attendanceId) => {
  try {
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return null;
    }
    
    attendance.productionHours = await calculateProductionHours(attendance);
    await attendance.save();
    return attendance;
  } catch (error) {
    console.error('Error updating production hours:', error);
    throw error;
  }
};

exports.punchIn = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Use UTC day boundaries
    const { today, tomorrow } = getTodayBoundaries();
    
    // Find today's attendance records for this user
    const todayAttendanceRecords = await Attendance.find({
      userId,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ sessionNumber: -1 });
    
    // Determine the new session number
    let sessionNumber = 1;
    if (todayAttendanceRecords.length > 0) {
      sessionNumber = todayAttendanceRecords[0].sessionNumber + 1;
    }
    
    // Get the current time in UTC
    const currentTime = new Date();
    
    // Create new attendance record - store directly as UTC
    const attendance = new Attendance({
      userId,
      checkIn: currentTime, // Store as UTC time
      date: today,
      sessionNumber: sessionNumber
    });
    
    // Business logic time thresholds in UTC
    const scheduledStart = createTunisiaTimeThreshold(8, 0); // 8:00 AM Tunisia time
    const lateThreshold = createTunisiaTimeThreshold(8, 30); // 8:30 AM Tunisia time
    
    // Calculate overtime if checked in before scheduled start
    if (attendance.checkIn < scheduledStart) {
      const earlyByMinutes = Math.floor((scheduledStart - attendance.checkIn) / (1000 * 60));
      attendance.earlyBy = earlyByMinutes;
      attendance.overtime = earlyByMinutes;
    }
    
    // Late check-in logic
    if (attendance.checkIn > lateThreshold) {
      const lateByMinutes = Math.floor((attendance.checkIn - lateThreshold) / (1000 * 60));
      attendance.lateBy = lateByMinutes;
      attendance.status = 'Late';
    } else {
      attendance.status = 'Present';
    }
    
    // Additional validations - using Tunisia time references (UTC+1)
    // Convert current UTC hour to Tunisia hour for validation
    const currentHourUTC = attendance.checkIn.getUTCHours();
    const currentHourTunisia = (currentHourUTC + 1) % 24;
    
    // Prevent punch-in outside work hours (between 6 AM and 10 PM Tunisia time)
    if (currentHourTunisia < 6 || currentHourTunisia >= 22) {
      return res.status(400).json({
        message: 'Punch-in is only allowed between 6 AM and 10 PM',
        status: 'invalid_time'
      });
    }
    
    // Production hours are 0 at punch-in (since there's no check-out yet)
    attendance.productionHours = 0;
    
    await attendance.save();
    
    // Return the saved data - MongoDB already stored it in UTC
    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.punchOut = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Use UTC day boundaries
    const { today, tomorrow } = getTodayBoundaries();

    // Find active session
    const attendance = await Attendance.findOne({
      userId,
      date: {
        $gte: today,
        $lt: tomorrow
      },
      checkIn: { $exists: true },
      checkOut: { $exists: false }
    });

    // Store checkout time in UTC
    attendance.checkOut = new Date();

    // Business logic threshold in UTC
    const scheduledEnd = createTunisiaTimeThreshold(18, 0); // 6:00 PM Tunisia time
    
    // Calculate overtime
    if (attendance.checkOut > scheduledEnd) {
      const overtimeMinutes = Math.floor((attendance.checkOut - scheduledEnd) / (1000 * 60));
      attendance.overtime = (attendance.overtime || 0) + overtimeMinutes;
    }
    
    // Calculate and update production hours
    attendance.productionHours = await calculateProductionHours(attendance);
    
    await attendance.save();
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.startBreak = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Use UTC day boundaries
    const { today, tomorrow } = getTodayBoundaries();
    
    // Get current time in UTC
    const currentTime = new Date();
    
    // Allowed lunch break time window in UTC
    const lunchTimeStart = createTunisiaTimeThreshold(12, 30); // 12:30 PM Tunisia time
    const lunchTimeEnd = createTunisiaTimeThreshold(14, 0); // 2:00 PM Tunisia time
    
    // Enforce time window restriction
    if (currentTime < lunchTimeStart || currentTime > lunchTimeEnd) {
      return res.status(400).json({
        message: 'Lunch break can only be started between 12:30 PM and 2:00 PM',
        allowedTimeStart: lunchTimeStart,
        allowedTimeEnd: lunchTimeEnd
      });
    }
    
    // Get active session
    const attendance = await Attendance.findOne({
      userId,
      date: {
        $gte: today,
        $lt: tomorrow
      },
      checkIn: { $exists: true },
      checkOut: { $exists: false }
    });

    // Start a new break - store in UTC
    attendance.breaks.push({
      startTime: currentTime,
    });
    
    // If we have check-out time, temporary calculate production hours
    // This is just for displaying accurate info, not necessarily the final value
    if (attendance.checkOut) {
      attendance.productionHours = await calculateProductionHours(attendance);
    }
    
    await attendance.save();
    const updatedAttendance = await Attendance.findById(attendance._id);
    
    res.json({ attendance: updatedAttendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.endBreak = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Use UTC day boundaries
    const { today, tomorrow } = getTodayBoundaries();
    
    // Get current time in UTC
    const currentTime = new Date();

    // Find active session
    const attendance = await Attendance.findOne({
      userId,
      date: {
        $gte: today,
        $lt: tomorrow
      },
      checkIn: { $exists: true },
      checkOut: { $exists: false }
    });

    // Get the active break
    const activeBreakIndex = attendance.breaks.findIndex(breakItem => !breakItem.endTime);
    
    if (activeBreakIndex === -1) {
      return res.status(400).json({
        message: 'No active break found.',
        status: 'no_active_break'
      });
    }
    
    const currentBreak = attendance.breaks[activeBreakIndex];
    const breakStartTime = new Date(currentBreak.startTime);

    // Calculate previous break durations
    let previousBreaksDuration = 0;
    for (let i = 0; i < activeBreakIndex; i++) {
      previousBreaksDuration += attendance.breaks[i].duration || 0;
    }

    // Log the actual end time
    currentBreak.endTime = currentTime;
    
    // Calculate actual break duration
    const breakDuration = Math.floor((currentTime - breakStartTime) / (1000 * 60));
    currentBreak.duration = breakDuration;

    // Total break time used today
    const totalBreakDuration = previousBreaksDuration + breakDuration;
    
    // If we have check-out time, recalculate production hours
    if (attendance.checkOut) {
      attendance.productionHours = await calculateProductionHours(attendance);
    }

    await attendance.save();

    res.json({
      attendance,
      breakDuration,
      totalBreakDuration,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.params.userId;
    const attendance = await Attendance.find({ userId })
      .sort({ date: -1 })
      .limit(10);
    
    // No need to convert dates - frontend will handle display
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get attendance logs for a specific user within a date range
exports.getUserAttendanceByDateRange = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { startDate, endDate } = req.query;

    // Parse dates and set time to beginning/end of day in UTC
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // Find attendance records within date range
    const attendance = await Attendance.find({
      userId,
      date: { $gte: start, $lte: end }
    })
    .populate('userId', 'firstName lastName position')
    .sort({ date: 1 });
    
    // No need to convert dates - frontend will handle display
    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get attendance for all employees managed by a specific manager
exports.getManagedEmployeesAttendance = async (req, res) => {
  try {
    const managerId = req.params.managerId;
    const { startDate, endDate } = req.query;
    
    // First, get all employees managed by this manager
    const employees = await User.find({ managerId }, '_id firstName lastName');
    
    // Create array for employee IDs
    const employeeIds = employees.map(employee => employee._id);
    
    // Add the manager's own ID to the list
    employeeIds.push(managerId);
    
    // Build query for attendance records
    let query = { userId: { $in: employeeIds } };
    
    // Add date range if provided - using UTC
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      
      query.date = { $gte: start, $lte: end };
    }
    
    // Get attendance records for all managed employees AND the manager
    const attendance = await Attendance.find(query)
      .populate('userId', 'firstName lastName position')
      .sort({ date: -1, 'userId.firstName': 1 });
    
    // No need to convert dates - frontend will handle display
    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get attendance for all employees (admin only)
exports.getAllEmployeesAttendance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build query for attendance records
    let query = {};
    
    // Add date range if provided - using UTC
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      
      query.date = { $gte: start, $lte: end };
    }
    
    // Get attendance records for all employees
    const attendance = await Attendance.find(query)
      .populate('userId', 'firstName lastName position')
      .sort({ date: -1, 'userId.firstName': 1 });
    
    // No need to convert dates - frontend will handle display
    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Function to mark absent users
exports.markAbsentUsers = async () => {
  try {
    
    // Use UTC day boundaries
    const { today, tomorrow } = getTodayBoundaries();
    // Get all users
    const allUsers = await User.find({});
    // Get users who are on approved leave today
    const approvedLeaveStatuses = ['Admin Approved', 'CEO Approved'];
    
    const usersOnLeave = await LeaveRequest.find({
      startDate: { $lte: today },
      endDate: { $gte: today },
      status: { $in: approvedLeaveStatuses }
    }).distinct('employeeId');
    
    // Check which users already have ANY attendance record for today (present, late or absent)
    const usersWithAttendanceToday = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).distinct('userId');
    
    // Filter out users who:
    // 1. Don't have any attendance record for today
    // 2. Are not on approved leave
    const absentUserIds = allUsers
      .filter(user => 
        !usersWithAttendanceToday.some(id => id.equals(user._id)) && 
        !usersOnLeave.some(id => id.equals(user._id))
      )
      .map(user => user._id);
    
    // Skip if there are no absent users
    if (absentUserIds.length === 0) {
      return 0;
    }
    
    // Create absent attendance records
    const absentRecords = absentUserIds.map(userId => ({
      userId,
      date: today,
      sessionNumber: 1, 
      status: 'Absent',
      productionHours: 0 // Absent users have 0 production hours
    }));
    // Insert the absent records
    const result = await Attendance.insertMany(absentRecords);
    return result.length;
  } catch (error) {
    throw error;
  }
};

exports.getActiveSession = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Use UTC day boundaries
    const { today, tomorrow } = getTodayBoundaries();
    
    // Find active session
    const activeSession = await Attendance.findOne({
      userId,
      date: {
        $gte: today,
        $lt: tomorrow
      },
      checkIn: { $exists: true },
      checkOut: { $exists: false }
    });
    
    // No need to convert dates - frontend will handle display
    res.json(activeSession || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTodaySessions = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Use UTC day boundaries
    const { today, tomorrow } = getTodayBoundaries();
    
    // Find all sessions for today
    const sessions = await Attendance.find({
      userId,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ sessionNumber: 1 });
    
    // No need to convert dates - frontend will handle display
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProductionHours = updateProductionHours;