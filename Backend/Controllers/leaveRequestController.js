const LeaveRequest = require("../Models/LeaveRequest");
const User = require("../Models/User");
const leaveHelper = require('../Middlewares/leaveCalculationHelper');
const { sendNotificationToUser, sendNotificationToRole } = require('../Middlewares/notificationService');


const updateLeaveBalanceOnApproval = async (req, res, next) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    
    // Only update balance on final approval
    if (req.user.role === 'admin' || 
       (req.user.role === 'manager' && !request.requiresAdminApproval) ||
       (req.user.role === 'superAdmin')) {
      
      // Update the employee's leave balance
      await leaveHelper.updateLeaveBalanceAfterApproval(request.employeeId, request._id);
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const checkForOverlappingRequests = async (userId, startDate, endDate) => {
  // Convert string dates to Date objects and reset time to 00:00:00
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  // Find any existing leave requests that overlap with the specified date range
  const overlappingRequests = await LeaveRequest.find({
    employeeId: userId,
    $or: [
      // Case 1: Start date falls within existing request
      { 
        $and: [
          { startDate: { $lte: end } },
          { endDate: { $gte: start } }
        ]
      }
    ],
    // Only consider requests that aren't rejected
    status: { $nin: ['Manager Rejected', 'Admin Rejected', 'CEO Rejected'] }
  });

  return overlappingRequests.length > 0;
};

exports.getAllLeaveRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role; // Assuming the user's role is available in the request

    let leaveRequests;

    switch (userRole) {
      case 'manager':
        leaveRequests = await LeaveRequest.find({
          $or: [
            {
              createdBy: "Manager",
              employeeId: userId
            }, // Requests created by the manager
            {
              managerId: userId,
              status: { $in: ["Pending", "Manager Approved", "Manager Rejected", "Admin Approved", "Admin Rejected"] }
            } // Requests assigned to the manager
          ]
        })
        .populate("employeeId", "firstName lastName email")
        .populate("managerId", "firstName lastName email")
        .lean();
        break;

      case 'admin':
        case 'superAdmin':
        leaveRequests = await LeaveRequest.find() // Fetch all requests
        .populate("employeeId", "firstName lastName email")
        .populate("managerId", "firstName lastName email")
        .lean();
        break;

      case 'employee':
        leaveRequests = await LeaveRequest.find({ employeeId: userId })
        .populate("managerId", "firstName lastName email")
        .lean();
        break;

      default:
        return res.status(403).json({ message: "Unauthorized role" });
    }

    res.status(200).json(leaveRequests);
  } catch (err) {
    console.error(`Error fetching ${req.user.role} leave requests:`, err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.createLeaveRequest = async (req, res) => {
  const { startDate, endDate, reason } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Check for overlapping leave requests
    const hasOverlap = await checkForOverlappingRequests(userId, startDate, endDate);
    
    if (hasOverlap) {
      return res.status(400).json({ 
        message: "You already have a leave request for this date range or part of it." 
      });
    }

    let managerId, createdBy;

    // Determine managerId and createdBy based on user role
    switch (userRole) {
      case 'employee':
        managerId = req.body.managerId;
        createdBy = 'Employee';
        break;
      case 'manager':
        managerId = req.body.adminId;
        createdBy = 'Manager';
        break;
      case 'admin':
        managerId = req.body.superAdminId;
        createdBy = 'Admin';
        break;
      default:
        return res.status(403).json({ message: "Unauthorized role" });
    }

    // Validate the leave request and get calculations
    const validation = await leaveHelper.validateLeaveRequest(
      userId,
      startDate,
      endDate
    );

    const leaveRequest = new LeaveRequest({
      employeeId: userId,
      managerId,
      startDate,
      endDate,
      reason,
      status: "Pending",
      createdBy
    });

    await leaveRequest.save();

    // Get user details for notifications
    const user = await User.findById(userId);


    // Send notifications based on role
    switch (userRole) {
      case 'employee':
        // Send notification to manager and admin
        await sendNotificationToUser(
          managerId,
          {
            title: 'New Leave Request',
            message: `${user.firstName} ${user.lastName} has requested leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
            type: 'leave_request',
            relatedId: leaveRequest._id
          }
        );

        await sendNotificationToRole(
          "admin",
          {
            title: 'New Leave Request',
            message: `${user.firstName} ${user.lastName} has requested leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
            type: 'leave_request',
            relatedId: leaveRequest._id
          }
        );
        break;

      case 'manager':
        // Send notification to admin
        await sendNotificationToUser(
          managerId,
          {
            title: 'New Leave Request from Manager',
            message: `Manager ${user.firstName} ${user.lastName} has requested leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
            type: 'leave_request',
            relatedId: leaveRequest._id
          }
        );
        break;

      case 'admin':
        // Send notification to super admin
        await sendNotificationToUser(
          managerId,
          {
            title: 'New Leave Request from Admin',
            message: `Admin ${user.firstName} ${user.lastName} has requested leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
            type: 'leave_request',
            relatedId: leaveRequest._id
          }
        );
        break;
    }

    res.status(201).json({
      message: "Leave request submitted successfully",
      leaveRequest,
      leaveBalance: {
        totalAccruedDays: validation.totalAccruedDays,
        daysTaken: validation.daysTaken,
        remainingDays: validation.remainingDays
      }
    });
  } catch (err) {
    if (err.message.includes('remaining leave days') || 
        err.message.includes('Insufficient leave days')) {
      return res.status(400).json({ message: err.message });
    }
    
    console.error("Error creating leave request:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.managerApproveRequest = [async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    
    if (request.status === 'Manager Approved') {
      return res.status(400).json({ message: 'Request has already been approved by manager' });
    }
     // Check if the request is already rejected by admin
     if (request.status === 'Manager Rejected') {
      return res.status(400).json({ message: 'Request has already been rejected by manager' });
    }
    if (['Pending'].includes(request.status)) {
      request.status = 'Manager Approved';
      await request.save();
      // Get employee details
      const employee = await User.findById(request.employeeId);
      const manager = await User.findById(req.user.id);
      // Send notification to employee
      await sendNotificationToUser(
        request.employeeId,
        {
          title: 'Leave Request Approved by Manager',
          message: `Your leave request from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} has been approved by ${manager.firstName} ${manager.lastName}.`,
          type: 'leave_approved',
          relatedId: request._id
        }
      );
      // Send notification to admin role
      await sendNotificationToRole(
        "admin",
        {
          title: 'Leave Request Approved by Manager',
          message: `${manager.firstName} ${manager.lastName} has approved a leave request for ${employee.firstName} ${employee.lastName} from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()}.`,
          type: 'leave_approved',
          relatedId: request._id
        }
      );
      return res.status(200).json({ message: 'Request approved by manager', request });
    }
   
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}];

// Manager rejects a leave request
exports.managerRejectRequest = async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);

     // Check if the request is already rejected by manager
     if (request.status === 'Manager Rejected') {
      return res.status(400).json({ message: 'Request has already been rejected by manager' });
    }
      // If the request is already Manager Approved, it can't be rejected
      if (request.status === 'Manager Approved') {
        return res.status(400).json({ message: 'Request has already been approved by manager' });
      }
    // If the status is Pending, Manager Approved we can reject it
    if (['Pending'].includes(request.status)) {
      request.status = 'Manager Rejected';
      await request.save();
     // Get employee details
     const employee = await User.findById(request.employeeId);
     const manager = await User.findById(req.user.id);
     
     // Send notification to employee
     await sendNotificationToUser(
       request.employeeId,
       {
         title: 'Leave Request Rejected by Manager',
         message: `Your leave request from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} has been rejected by ${manager.firstName} ${manager.lastName}.`,
         type: 'leave_rejected',
         relatedId: request._id
       }
     );
     
     // Send notification to admin role
     await sendNotificationToRole(
       "admin",
       {
         title: 'Leave Request Rejected by Manager',
         message: `${manager.firstName} ${manager.lastName} has rejected a leave request for ${employee.firstName} ${employee.lastName} from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()}.`,
         type: 'leave_rejected',
         relatedId: request._id
       }
     );
     
     return res.status(200).json({ message: 'Request rejected by manager', request });
   }
  
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Admin Approves a Leave Request
exports.adminApproveRequest = [updateLeaveBalanceOnApproval, async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    // Check if the request is already approved by admin
    if (request.status === 'Admin Approved') {
      return res.status(400).json({ message: 'Request has already been approved by admin' });
    }
    if (request.status === 'Admin Rejected') {
      return res.status(400).json({ message: 'Request has already been rejected by admin' });
    }
    // If the status is either Pending, Manager Approved we can approve it.
    if (['Pending', 'Manager Approved', 'Manager Rejected'].includes(request.status)) {
      request.status = 'Admin Approved';
      await request.save();

      // Get employee details
      const employee = await User.findById(request.employeeId);
      
      // Send notifications based on who created the leave request
      if (request.createdBy === 'Manager') {
        // For manager-created requests, only notify the manager who created it
        await sendNotificationToUser(
          request.employeeId, // This is actually the manager who created the request
          {
            title: 'Your Leave Request Approved by Admin',
            message: `Your leave request from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} has been approved by admin.`,
            type: 'leave_approved',
            relatedId: request._id
          }
        );
      } else if (request.createdBy === 'Employee') {
        // For employee-created requests, notify both employee and their manager
        
        // Send notification to employee
        await sendNotificationToUser(
          request.employeeId,
          {
            title: 'Leave Request Approved by Admin',
            message: `Your leave request from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} has been approved by admin.`,
            type: 'leave_approved',
            relatedId: request._id
          }
        );
        
        // Send notification to manager (if different from employee)
        if (request.managerId && request.managerId.toString() !== request.employeeId.toString()) {
          await sendNotificationToUser(
            request.managerId,
            {
              title: 'Leave Request Approved by Admin',
              message: `A leave request for ${employee.firstName} ${employee.lastName} from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} has been approved by admin.`,
              type: 'leave_approved',
              relatedId: request._id
            }
          );
        }
      }
      
      return res.status(200).json({ message: 'Request approved by admin', request });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}];

// Admin rejects a request
exports.adminRejectRequest = async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    // Check if the request is already rejected by admin
    if (request.status === 'Admin Rejected') {
      return res.status(400).json({ message: 'Request has already been rejected by admin' });
    }
    // If the request is already Admin Approved, it can't be rejected
    if (request.status === 'Admin Approved') {
      return res.status(400).json({ message: 'Request has already been approved by admin' });
    }
    // If the status is Pending, Manager Approved, or Manager Rejected, we can reject it
    if (['Pending', 'Manager Approved', 'Manager Rejected'].includes(request.status)) {
      request.status = 'Admin Rejected';
      await request.save();
      
      // Get employee details
      const employee = await User.findById(request.employeeId);
      
      // Send notifications based on who created the leave request
      if (request.createdBy === 'Manager') {
        // For manager-created requests, only notify the manager who created it
        await sendNotificationToUser(
          request.employeeId, // This is actually the manager who created the request
          {
            title: 'Your Leave Request Rejected by Admin',
            message: `Your leave request from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} has been rejected by HR.`,
            type: 'leave_rejected',
            relatedId: request._id
          }
        );
      } else if (request.createdBy === 'Employee') {
        // For employee-created requests, notify both employee and their manager
        
        // Send notification to employee
        await sendNotificationToUser(
          request.employeeId,
          {
            title: 'Leave Request Rejected by Admin',
            message: `Your leave request from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} has been rejected by HR.`,
            type: 'leave_rejected',
            relatedId: request._id
          }
        );
        
        // Send notification to manager (if different from employee)
        if (request.managerId && request.managerId.toString() !== request.employeeId.toString()) {
          await sendNotificationToUser(
            request.managerId,
            {
              title: 'Leave Request Rejected by Admin',
              message: `A leave request for ${employee.firstName} ${employee.lastName} from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} has been rejected by HR.`,
              type: 'leave_rejected',
              relatedId: request._id
            }
          );
        }
      }
      
      return res.status(200).json({ message: 'Request rejected by admin', request });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// SuperAdmin approves a leave request
exports.superAdminApproveRequest = [updateLeaveBalanceOnApproval, async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    
    // If the status is Pending, we can approve it
    if (['Pending'].includes(request.status)) {
      request.status = 'CEO Approved';
      await request.save();
    
       // Send notification to admin who created the request
       await sendNotificationToUser(
         request.employeeId,
         {
           title: 'Leave Request Approved by CEO',
           message: `Your leave request from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} has been approved by CEO.`,
           type: 'leave_approved',
           relatedId: request._id
         }
       );
      return res.status(200).json({ message: 'Request approved by CEO', request });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}];

// SuperAdmin rejects a leave request
exports.superAdminRejectRequest = async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    // If the status is Pending, we can reject it
    if (['Pending'].includes(request.status)) {
      request.status = 'CEO Rejected';
      await request.save();
        
        // Send notification to admin who created the request
        await sendNotificationToUser(
          request.employeeId,
          {
            title: 'Leave Request Rejected by CEO',
            message: `Your leave request from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()} has been rejected by CEO.`,
            type: 'leave_rejected',
            relatedId: request._id
          }
        );
        
      return res.status(200).json({ message: 'Request rejected by CEO', request });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Function for superAdmin (CEO) 
exports.getAdminCreatedLeaveRequests = async (req, res) => {
  try {
    const superAdminId = req.user.id;
    // Find all leave requests where the superAdmin is listed as the manager
    const adminLeaveRequests = await LeaveRequest.find({ 
      managerId: superAdminId,
      createdBy: 'Admin' 
    })
      .populate("employeeId", "firstName lastName email role")
      .populate("managerId", "firstName lastName email role")
      .lean();
    
    // Check if any requests were found
    if (!adminLeaveRequests || adminLeaveRequests.length === 0) {
      return res.status(404).json({ message: "No leave requests found" });
    }
    
    res.status(200).json(adminLeaveRequests);
  } catch (err) {
    console.error("Error fetching admin leave requests:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};