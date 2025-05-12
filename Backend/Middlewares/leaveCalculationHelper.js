const User = require("../Models/User");
const LeaveRequest = require("../Models/LeaveRequest");

/**
 * Calculate days between two dates (inclusive)
 */
const calculateDaysBetweenDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set time to midnight to ensure accurate day calculation
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
};

/**
 * Calculate accrued leave days based on months worked and role
 * Managers/Admins: 2 days per month
 * Employees: 1 day per month
 */
const calculateAccruedLeaveDays = (hireDate, role, currentDate = new Date()) => {
  const hireDateObj = new Date(hireDate);
  const referenceDate = new Date(currentDate);
  
  // Calculate months worked
  const monthsWorked = (referenceDate.getFullYear() - hireDateObj.getFullYear()) * 12 +
    (referenceDate.getMonth() - hireDateObj.getMonth());
  
  // Apply role-based accrual rate for each month
  const monthlyAccrual = (role === 'employee') ? 1 : 2;
  const accruedDays = monthsWorked * monthlyAccrual;
  
  return Math.max(0, accruedDays);
};

/**
 * Calculate total days taken in current year
 */
const calculateDaysTaken = async (userId) => {
  const approvedRequests = await LeaveRequest.find({
    employeeId: userId,
    status: { $in: ['Admin Approved', 'CEO Approved'] },
  });

  return approvedRequests.reduce((total, request) => {
    return total + calculateDaysBetweenDates(request.startDate, request.endDate);
  }, 0);
};

/**
 * Initialize or update a user's leave balance
 */
const updateUserLeaveBalance = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  // Calculate total accrued days based on hire date and role
  const totalAccruedDays = calculateAccruedLeaveDays(user.hireDate, user.role);
  
  // Calculate days already taken
  const daysTaken = await calculateDaysTaken(userId);
  
  // Update user's leave allowance and remaining days
  user.leaveRequestAllowed = totalAccruedDays;
  user.remainingLeaveDays = Math.max(0, totalAccruedDays - daysTaken);
  
  await user.save();
  
  return {
    totalAccruedDays,
    daysTaken,
    remainingDays: user.remainingLeaveDays
  };
};

/**
 * Validate a leave request and check available days
 */
const validateLeaveRequest = async (userId, startDate, endDate) => {
  // Make sure user balance is up to date
  await updateUserLeaveBalance(userId);
  
  // Get user with their stored leave balance
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  // Calculate requested days
  const daysRequested = calculateDaysBetweenDates(startDate, endDate);
  const remainingDays = user.remainingLeaveDays;

  if (remainingDays = 0) {
    throw new Error('You have no remaining leave days available.');
  }

  if (daysRequested > remainingDays) {
    throw new Error(
      `Insufficient leave days. You have ${remainingDays} days remaining but requested ${daysRequested} days.`
    );
  }

  return {
    totalAccruedDays: user.leaveRequestAllowed,
    daysTaken: user.leaveRequestAllowed - user.remainingLeaveDays,
    remainingDays,
    daysRequested
  };
};

/**
 * Update user's leave balance after request approval
 */
const updateLeaveBalanceAfterApproval = async (userId, leaveRequestId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  const leaveRequest = await LeaveRequest.findById(leaveRequestId);
  if (!leaveRequest) throw new Error('Leave request not found');

  const daysRequested = calculateDaysBetweenDates(leaveRequest.startDate, leaveRequest.endDate);
  
  // Update remaining days
  user.remainingLeaveDays = Math.max(0, user.remainingLeaveDays - daysRequested);
  await user.save();
  
  return user.remainingLeaveDays;
};

/**
 * Update all users' leave balances - to be run monthly
 */
const updateAllUsersLeaveBalance = async () => {
  try {
    const users = await User.find();
    let updatedCount = 0;
    
    for (const user of users) {
      await updateUserLeaveBalance(user._id);
      updatedCount++;
    }
    
    console.log(`Monthly leave balance update completed. Updated ${updatedCount} users.`);
    return { success: true, updatedCount };
  } catch (error) {
    console.error("Error updating all users leave balance:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  calculateDaysBetweenDates,
  calculateAccruedLeaveDays,
  validateLeaveRequest,
  updateLeaveBalanceAfterApproval,
  updateUserLeaveBalance,
  updateAllUsersLeaveBalance
};