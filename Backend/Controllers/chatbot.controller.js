const ChatMessage = require('../Models/chatbot.model');
const User = require("../Models/User");
const LeaveRequest = require("../Models/LeaveRequest");
const CalendarEvent = require('../Models/CalendarEvent');
const Resource = require('../Models/Resource');
const Department = require('../Models/Department');
const Attendance = require('../Models/Attendance.js');



// Expanded company knowledge base
const companyKnowledge = {
  leavePolicy: "Employees accrue two additional leave days for each month of service.",
  workHours: "Standard work hours are 8:00 AM to 6:00 PM with a 1-hour and a half lunch break starting from 12:30 PM to 14:00 PM.",
  contactHR: "For HR inquiries, please contact HR.",
  leaveTypes: ["Sick Leave", "Vacation Leave", "Maternity Leave", "Personal Leave", "Emergency Leave", "Unpaid Leave"],
  resourceTypes: ["desktop", "meetingRoom", "office", "robot", "toolKit", "testingEquipment", "prototype"],
  eventTypes: ["meeting", "mission", "resourceReservation"]
};

// Enhanced NLP-like keyword detection
const keywordMap = {
  leave: ['leave', 'vacation', 'time off', 'day off', 'sick', 'absence', 'holiday', 'pto'],
  leaveStatus: ['status', 'approved', 'rejected', 'pending', 'request'],
  event: ['event', 'meeting', 'mission', 'calendar', 'schedule', 'appointment', 'reservation'],
  user: ['user', 'colleague', 'employee', 'coworker', 'staff', 'person', 'contact', 'find', 'who'],
  department: ['department', 'team', 'division', 'group', 'unit'],
  resource: ['resource', 'reserve', 'booking', 'equipment', 'room', 'device', 'tool', 'robot', 'prototype'],
  attendance: ['attendance', 'check in', 'check out', 'present', 'absent', 'late', 'overtime', 'productive', 'break'],
  profile: ['profile', 'my info', 'personal info', 'my details', 'my account', 'my skills'],
  workHours: ['work hours', 'working hours', 'schedule', 'shifts', 'workday'],
  salary: ['salary', 'pay', 'compensation', 'wage', 'earnings']
};

const handleLeaveQueries = async (userId, message) => {
  message = message.toLowerCase();
  
  // Determine the specific leave-related intent
  if (isStatusQuery(message)) {
    return await getLeaveRequestStatus(userId, message);
  } else if (isBalanceQuery(message)) {
    return await getLeaveBalance(userId, message);
  } else if (isLeaveProcessQuery(message)) {
    return getLeaveProcessInformation(message);
  } else if (isUpcomingLeaveQuery(message)) {
    return await getUpcomingLeave(userId);
  } else if (isPastLeaveQuery(message)) {
    return await getPastLeave(userId);
  } else if (isLeaveTypeQuery(message)) {
    return getLeaveTypeInformation(message);
  } else {
    // General leave information
    return await getGeneralLeaveInfo(userId);
  }
};

// Helper functions to determine specific intents
const isStatusQuery = (message) => {
  const statusTerms = ['status', 'approved', 'rejected', 'pending', 'request', 'submitted', 'progress'];
  return statusTerms.some(term => message.includes(term));
};

const isBalanceQuery = (message) => {
  const balanceTerms = ['balance', 'remaining', 'left', 'available', 'how many', 'days left', 'days remaining'];
  return balanceTerms.some(term => message.includes(term));
};

const isLeaveProcessQuery = (message) => {
  const processTerms = ['process', 'apply', 'request', 'how to', 'procedure', 'submit', 'file'];
  return processTerms.some(term => message.includes(term)) && 
         !isStatusQuery(message); // To disambiguate from status queries that might contain "request"
};

const isUpcomingLeaveQuery = (message) => {
  const upcomingTerms = ['upcoming', 'next', 'scheduled', 'planned', 'future', 'coming'];
  return upcomingTerms.some(term => message.includes(term));
};

const isPastLeaveQuery = (message) => {
  const pastTerms = ['last', 'previous', 'past', 'history', 'taken', 'used'];
  return pastTerms.some(term => message.includes(term));
};

const isLeaveTypeQuery = (message) => {
  const leaveTypes = [
    'sick leave', 'vacation leave', 'maternity leave', 'paternity leave', 
    'personal leave', 'emergency leave', 'unpaid leave'
  ];
  
  // Check for specific leave type queries
  const hasSpecificType = leaveTypes.some(type => message.includes(type)) && 
    (message.includes('what is') || message.includes('explain') || 
     message.includes('define') || message.includes('details') || 
     message.includes('policy'));
  
  // Check for general leave types query
  const isGeneralTypeQuery = 
    (message.includes('types of leave') || 
     message.includes('leave types') || 
     message.includes('what leave') || 
     message.includes('which leave')) && 
    (message.includes('can i') || 
     message.includes('available') || 
     message.includes('offer') || 
     message.includes('take'));
  
  return hasSpecificType || isGeneralTypeQuery;
};

// Get detailed leave balance information
const getLeaveBalance = async (userId, message) => {
  try {
    const user = await User.findById(userId).select('firstName lastName remainingLeaveDays remainingLeaveByType');
    
    if (!user) {
      return "I couldn't find your leave balance information. Please contact HR for assistance.";
    }
    
    // Check if query is about a specific leave type
    const leaveTypes = [
      'sick leave', 'vacation leave', 'maternity leave', 'paternity leave', 
      'personal leave', 'emergency leave', 'unpaid leave'
    ];
    
    const requestedType = leaveTypes.find(type => message.includes(type));
    
    if (requestedType) {
      // If user has remainingLeaveByType field populated
      if (user.remainingLeaveByType && typeof user.remainingLeaveByType === 'object') {
        const typeKey = requestedType.replace(' leave', '').toLowerCase();
        const daysRemaining = user.remainingLeaveByType[typeKey] || 0;
        
        return `You have ${daysRemaining} days of ${requestedType} remaining this year.`;
      } else {
        // Fallback if specific type data isn't available
        return `Your total remaining leave balance is ${user.remainingLeaveDays} days. For specific ${requestedType} details, please check with HR.`;
      }
    } else {
      // General balance inquiry
      if (user.remainingLeaveByType && typeof user.remainingLeaveByType === 'object') {
        let response = `Hello ${user.firstName}, your current leave balances are:\n\n`;
        
        // Get the policies for context
        const leaveTypeDetails = {
          sick: { label: "Sick Leave", annual: 14 },
          vacation: { label: "Vacation Leave", annual: 20 },
          maternity: { label: "Maternity Leave", annual: 90 },
          paternity: { label: "Paternity Leave", annual: 10 },
          personal: { label: "Personal Leave", annual: 5 },
          emergency: { label: "Emergency Leave", annual: 5 },
          unpaid: { label: "Unpaid Leave", annual: "As approved" }
        };
        
        // Build detailed response
        for (const [type, label] of Object.entries(leaveTypeDetails)) {
          if (type !== 'unpaid') {  // Skip unpaid leave as it doesn't have a fixed balance
            const remaining = user.remainingLeaveByType[type] || 0;
            const used = label.annual - remaining;
            response += `- ${label.label}: ${remaining} days remaining (${used} used of ${label.annual})\n`;
          }
        }
        
        response += `\nTotal remaining balance: ${user.remainingLeaveDays} days`;
        return response;
      } else {
        return `Your total remaining leave balance is ${user.remainingLeaveDays} days for this year.`;
      }
    }
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    return "I couldn't retrieve your leave balance information. Please try again later or contact HR.";
  }
};

// Get upcoming leave information
const getUpcomingLeave = async (userId) => {
  try {
    const today = new Date();
    const upcomingLeaves = await LeaveRequest.find({
      employeeId: userId,
      startDate: { $gte: today },
      status: { $in: ['Manager Approved', 'Admin Approved', 'CEO Approved'] }
    }).sort({ startDate: 1 }).limit(3);
    
    if (upcomingLeaves.length === 0) {
      return "You don't have any upcoming approved leaves scheduled.";
    }
    
    if (upcomingLeaves.length === 1) {
      const leave = upcomingLeaves[0];
      // Calculate duration
      const days = Math.round((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      
      return `Your next approved leave is ${leave.reason} from ${new Date(leave.startDate).toDateString()} to ${new Date(leave.endDate).toDateString()} (${days} days).`;
    } else {
      let response = "Your upcoming approved leaves are:\n\n";
      
      upcomingLeaves.forEach((leave, index) => {
        // Calculate duration
        const days = Math.round((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        
        response += `${index + 1}. ${leave.reason} from ${new Date(leave.startDate).toDateString()} to ${new Date(leave.endDate).toDateString()} (${days} days)\n`;
      });
      
      return response;
    }
  } catch (error) {
    console.error('Error fetching upcoming leave:', error);
    return "I couldn't retrieve your upcoming leave information. Please try again later.";
  }
};

// Get past leave information
const getPastLeave = async (userId) => {
  try {
    const today = new Date();
    const pastLeaves = await LeaveRequest.find({
      employeeId: userId,
      endDate: { $lt: today },
      status: { $in: ['Manager Approved', 'Admin Approved', 'CEO Approved'] }
    }).sort({ endDate: -1 }).limit(5);
    
    if (pastLeaves.length === 0) {
      return "You don't have any past approved leaves in the system.";
    }
    
    if (pastLeaves.length === 1) {
      const leave = pastLeaves[0];
      // Calculate duration
      const days = Math.round((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      
      return `Your most recent leave was ${leave.reason} from ${new Date(leave.startDate).toDateString()} to ${new Date(leave.endDate).toDateString()} (${days} days).`;
    } else {
      let response = "Your leave history (most recent first):\n\n";
      
      pastLeaves.forEach((leave, index) => {
        // Calculate duration
        const days = Math.round((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        
        response += `${index + 1}. ${leave.reason} from ${new Date(leave.startDate).toDateString()} to ${new Date(leave.endDate).toDateString()} (${days} days)\n`;
      });
      
      return response;
    }
  } catch (error) {
    console.error('Error fetching past leave:', error);
    return "I couldn't retrieve your leave history. Please try again later.";
  }
};

// Get information about leave types
const getLeaveTypeInformation = (message) => {
  const leaveTypeInfo = {
    'sick leave': "Sick Leave is provided for health-related absences...",
    // other leave types...
  };
  
  // General leave types query
  if (message.includes('types of leave') || 
      message.includes('leave types') || 
      (message.includes('what') && message.includes('leave'))) {
    return "We offer the following leave types: " + companyKnowledge.leaveTypes.join(", ") + 
           ". You can ask about any specific type for more details.";
  }
  
  // Find the specific leave type mentioned in the query
  for (const [leaveType, info] of Object.entries(leaveTypeInfo)) {
    if (message.includes(leaveType)) {
      return info;
    }
  }
  
  // If no specific type is found but it's a leave type query
  return "We offer the following leave types: " + companyKnowledge.leaveTypes.join(", ") + 
         ". Please ask about a specific type for more details.";
};

// Get information about leave request process
const getLeaveProcessInformation = (message) => {
  // Check if the query is about a specific leave type
  const leaveTypes = [
    'sick leave', 'vacation leave', 'maternity leave', 'paternity leave', 
    'personal leave', 'emergency leave', 'unpaid leave'
  ];
  
  const requestedType = leaveTypes.find(type => message.includes(type));
  
  const generalProcess = "To request leave, go to the 'Leave Requests' section in the navigation menu. Click on 'New Request', select the leave type, enter start and end dates, and submit. Your request will be sent to your manager for approval.";
  
  if (!requestedType) {
    return generalProcess;
  }
  
  // Specific instructions based on leave type
  switch(requestedType) {
    case 'sick leave':
      return `${generalProcess} For sick leave, if it's urgent, you can submit retroactively within 48 hours of return. For absences exceeding 3 days, please attach a medical certificate.`;
    case 'vacation leave':
      return `${generalProcess} For vacation leave, please submit your request at least 7 days before the planned date to allow for approval and scheduling adjustments.`;
    case 'maternity leave':
      return `${generalProcess} For maternity leave, please attach medical documentation confirming your expected delivery date. You can start your leave up to 2 weeks before the expected date.`;
    case 'emergency leave':
      return `${generalProcess} For emergency leave, submit your request as soon as possible, even if retroactively. Please provide a brief reason for the emergency.`;
    default:
      return `${generalProcess} For ${requestedType}, follow the standard request process in the system.`;
  }
};

// Enhanced general leave info function
const getGeneralLeaveInfo = async (userId) => {
  try {
    const user = await User.findById(userId).select('firstName lastName remainingLeaveDays');
    
    if (!user) {
      return "Our company offers several leave types including Sick Leave, Vacation Leave, Maternity Leave, Paternity Leave, Personal Leave, Emergency Leave, and Unpaid Leave. You can request leave from the 'Leave Requests' section. For specific questions about your leave balance or requests, please log in to your account.";
    }
    
    // Get quick summary
    const today = new Date();
    const activeLeave = await LeaveRequest.findOne({
      employeeId: userId,
      startDate: { $lte: today },
      endDate: { $gte: today },
      status: { $in: ['Manager Approved', 'Admin Approved', 'CEO Approved'] }
    });
    
    const pendingRequests = await LeaveRequest.countDocuments({
      employeeId: userId,
      status: 'Pending'
    });
    
    const upcomingLeave = await LeaveRequest.findOne({
      employeeId: userId,
      startDate: { $gt: today },
      status: { $in: ['Manager Approved', 'Admin Approved', 'CEO Approved'] }
    }).sort({ startDate: 1 });
    
    let response = `Hello ${user.firstName}, you currently have ${user.remainingLeaveDays} leave days remaining this year.`;
    
    if (activeLeave) {
      response += ` You are currently on ${activeLeave.reason} until ${new Date(activeLeave.endDate).toDateString()}.`;
    }
    
    if (pendingRequests > 0) {
      response += ` You have ${pendingRequests} pending leave request(s).`;
    }
    
    if (upcomingLeave) {
      response += ` Your next approved leave is ${upcomingLeave.reason} starting ${new Date(upcomingLeave.startDate).toDateString()}.`;
    }
    
    response += "\n\nWhat specific information would you like about leave? You can ask about your balance, request status, upcoming or past leaves, or how to request leave.";
    
    return response;
  } catch (error) {
    console.error('Error fetching general leave info:', error);
    return "Our company offers several leave types including Sick Leave, Vacation Leave, Maternity Leave, Paternity Leave, Personal Leave, Emergency Leave, and Unpaid Leave";
  }}
// More sophisticated query type determination with better pattern matching
const determineQueryType = (message) => {
  message = message.toLowerCase();
  
  // Helper function to check if message contains keywords from a category
  const containsKeywords = (category) => {
    return keywordMap[category].some(keyword => message.includes(keyword));
  };
  
  // Check for attendance-related queries
  if (containsKeywords('attendance')) {
    return 'attendanceInfo';
  }
  
  // Check for leave-related queries
  if (containsKeywords('leave')) {
    if (containsKeywords('leaveStatus')) {
      return 'leaveRequestStatus';
    }
    return 'leaveInfo';
  }
  
  // Check for event-related queries
  if (containsKeywords('event')) {
    return 'eventInfo';
  }
  
  // Check for user-related queries
  if (containsKeywords('user')) {
    return 'userInfo';
  }
  
  // Check for department-related queries
  if (containsKeywords('department')) {
    return 'departmentInfo';
  }
  
  // Check for resource-related queries
  if (containsKeywords('resource')) {
    return 'resourceInfo';
  }
  
  // Check for personal profile queries
  if (containsKeywords('profile')) {
    return 'profileInfo';
  }
  
  // Check for work hours queries
  if (containsKeywords('workHours')) {
    return 'workHoursInfo';
  }
  
  // Check for salary-related queries
  if (containsKeywords('salary')) {
    return 'salaryInfo';
  }
  
  // Default to static responses for general inquiries
  return 'staticInfo';
};

// Enhanced static information handler
const getStaticResponse = (message) => {
  message = message.toLowerCase();
  
  // Leave policy
  if (message.includes("leave policy") || message.includes("leave rules")) {
    return companyKnowledge.leavePolicy + " The leave types available are: " + companyKnowledge.leaveTypes.join(", ") + ".";
  }
  
  if (message.includes("leave") || message.includes("vacation") || message.includes("time off")) {
    return companyKnowledge.leavePolicy;
  }
  
  // Work hours
  if (message.includes("workhours") || message.includes("working hours") || message.includes("office hours") || message.includes("business hours") || message.includes("when do we work")) {
  return companyKnowledge.workHours;
  }
  
  // HR contact
  if (message.includes("contact hr") || message.includes("hr contact") || message.includes("human resources")) {
    return companyKnowledge.contactHR;
  }
  
  // Resource types
  if (message.includes("resource types") || message.includes("equipment types")) {
    return "Available resource types: " + companyKnowledge.resourceTypes.join(", ") + ".";
  }
  
  // Event types
  if (message.includes("event types")) {
    return "Available event types: " + companyKnowledge.eventTypes.join(", ") + ".";
  }
  
  // Help command
  if (message.includes("help") || message.includes("commands") || message.includes("what can you do")) {
    return "I can help you with:\n" +
           "- Leave requests and status\n" +
           "- Calendar events and meetings\n" +
           "- Finding colleague information\n" +
           "- Department details\n" +
           "- Resource availability\n" +
           "- Your attendance records\n" +
           "- Company policies\n" +
           "Just ask me about any of these topics!";
  }
  
  // Default response
  return "I don't have specific information about that. Please contact HR for assistance.";
};

// Enhanced leave request status handler with more detailed responses
const getLeaveRequestStatus = async (userId, message) => {
   
  try {
    // Find the user's leave requests
    const leaveRequests = await LeaveRequest.find({ employeeId: userId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    if (leaveRequests.length === 0) {
      return "You don't have any leave requests in the system. You can create a new leave request from the Leave Management section.";
    }
    
    // Check for specific leave types
    const leaveTypes = companyKnowledge.leaveTypes.map(type => type.toLowerCase());
    const requestedLeaveType = leaveTypes.find(type => message.toLowerCase().includes(type.toLowerCase()));
    
    if (requestedLeaveType) {
      const typeRequests = leaveRequests.filter(req => 
        req.reason.toLowerCase() === requestedLeaveType.toLowerCase()
      );
      
      if (typeRequests.length > 0) {
        return `You have ${typeRequests.length} ${requestedLeaveType} request(s). The most recent one is from ${typeRequests[0].startDate.toDateString()} to ${typeRequests[0].endDate.toDateString()} (Status: ${typeRequests[0].status}).`;
      } else {
        return `You don't have any ${requestedLeaveType} requests.`;
      }
    }
    
    // If looking for a specific status
    if (message.includes('pending')) {
      const pending = leaveRequests.filter(req => req.status === 'Pending');
      if (pending.length > 0) {
        return `You have ${pending.length} pending leave request(s). The most recent one is from ${pending[0].startDate.toDateString()} to ${pending[0].endDate.toDateString()} for ${pending[0].reason}.`;
      } else {
        return "You don't have any pending leave requests at the moment.";
      }
    }
    
    if (message.includes('approved')) {
      const approved = leaveRequests.filter(req => 
        ['Manager Approved', 'Admin Approved', 'CEO Approved'].includes(req.status)
      );
      if (approved.length > 0) {
        return `You have ${approved.length} approved leave request(s). The most recent one is from ${approved[0].startDate.toDateString()} to ${approved[0].endDate.toDateString()} for ${approved[0].reason} (${approved[0].status}).`;
      } else {
        return "You don't have any approved leave requests at the moment.";
      }
    }
    
    if (message.includes('rejected') || message.includes('declined')) {
      const rejected = leaveRequests.filter(req => 
        ['Manager Rejected', 'Admin Rejected', 'CEO Rejected'].includes(req.status)
      );
      if (rejected.length > 0) {
        return `You have ${rejected.length} rejected leave request(s). The most recent one was for ${rejected[0].startDate.toDateString()} to ${rejected[0].endDate.toDateString()} (${rejected[0].reason}).`;
      } else {
        return "You don't have any rejected leave requests.";
      }
    }
    
    // General leave status overview
    const pending = leaveRequests.filter(req => req.status === 'Pending').length;
    const managerApproved = leaveRequests.filter(req => req.status === 'Manager Approved').length;
    const adminApproved = leaveRequests.filter(req => req.status === 'Admin Approved').length;
    const ceoApproved = leaveRequests.filter(req => req.status === 'CEO Approved').length;
    const rejected = leaveRequests.filter(req => 
      ['Manager Rejected', 'Admin Rejected', 'CEO Rejected'].includes(req.status)
    ).length;
    
    // Calculate upcoming and current leave
    const today = new Date();
    const upcomingLeave = leaveRequests.find(req => 
      new Date(req.startDate) > today && 
      ['Manager Approved', 'Admin Approved', 'CEO Approved'].includes(req.status)
    );
    
    const currentLeave = leaveRequests.find(req => 
      new Date(req.startDate) <= today && 
      new Date(req.endDate) >= today && 
      ['Manager Approved', 'Admin Approved', 'CEO Approved'].includes(req.status)
    );
    
    let response = `You have ${pending} pending, ${managerApproved + adminApproved + ceoApproved} approved, and ${rejected} rejected leave requests.`;
    
    if (currentLeave) {
      response += ` You are currently on ${currentLeave.reason} until ${currentLeave.endDate.toDateString()}.`;
    }
    
    if (upcomingLeave && !currentLeave) {
      response += ` Your next approved leave is ${upcomingLeave.reason} from ${upcomingLeave.startDate.toDateString()} to ${upcomingLeave.endDate.toDateString()}.`;
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return "I couldn't retrieve your leave request information. Please try again later.";
  }
};

// Additional handler for generic leave information
const getLeaveInfo = async (userId, message) => {
  try {
    const user = await User.findById(userId);
    if (!user || user.remainingLeaveDays === undefined) {
      return companyKnowledge.leavePolicy;
    }
    
    // Extract leave type from message
    const leaveTypes = companyKnowledge.leaveTypes.map(type => type.toLowerCase());
    const requestedLeaveType = leaveTypes.find(type => message.toLowerCase().includes(type));
    
    if (requestedLeaveType) {
      // Check leave balance for the specific type
      return `You have ${user.remainingLeaveDays} remaining ${requestedLeaveType} leave days for this year.`;
    }
    
    // Checking upcoming leave
    const today = new Date();
    const upcomingLeave = await LeaveRequest.findOne({
      employeeId: userId,
      startDate: { $gte: today },
      status: { $in: ['Manager Approved', 'Admin Approved', 'CEO Approved'] }
    }).sort({ startDate: 1 });
    
    if (message.includes('upcoming') || message.includes('next')) {
      return upcomingLeave
        ? `Your next approved leave is ${upcomingLeave.reason} from ${upcomingLeave.startDate.toDateString()} to ${upcomingLeave.endDate.toDateString()}.`
        : "You don't have any upcoming approved leaves.";
    }
    
    // Checking past leave history
    const pastLeave = await LeaveRequest.findOne({
      employeeId: userId,
      endDate: { $lt: today },
      status: { $in: ['Manager Approved', 'Admin Approved', 'CEO Approved'] }
    }).sort({ endDate: -1 });
    
    if (message.includes('last') || message.includes('previous')) {
      return pastLeave
        ? `Your last leave was ${pastLeave.reason} from ${pastLeave.startDate.toDateString()} to ${pastLeave.endDate.toDateString()}.`
        : "You haven't taken any leave recently.";
    }
    
    // General leave balance inquiry
    if (message.includes('remaining') || message.includes('balance')) {
      return `You have ${user.remainingLeaveDays} leave days remaining for this year.`;
    }
    
    return `You have ${user.remainingLeaveDays} remaining leave days for this year. ${companyKnowledge.leavePolicy}`;
  } catch (error) {
    console.error('Error fetching leave information:', error);
    return "I couldn't retrieve your leave information. Please try again later.";
  }
};

const handleEventQueries = async (userId, message) => {
  message = message.toLowerCase();
  
  // Determine the specific event-related intent
  if (isSpecificEventDateQuery(message)) {
    return await getSpecificDateEvents(userId, message);
  } else if (isEventTypeQuery(message)) {
    return await getEventsByType(userId, message);
  } else if (isUpcomingEventsQuery(message)) {
    return await getUpcomingEvents(userId, message);
  } else if (isEventDetailsQuery(message)) {
    return await getEventDetails(userId, message);
  } else if (isEventStatusQuery(message)) {
    return await getEventStatus(userId, message);
  } else if (isEventParticipantsQuery(message)) {
    return await getEventParticipants(userId, message);
  } else {
    // General event information
    return await getGeneralEventInfo(userId);
  }
};

// Helper functions to determine specific intents
const isSpecificEventDateQuery = (message) => {
  const dateTerms = ['today', 'tomorrow', 'next week', 'this week', 'month', 'weekend'];
  return dateTerms.some(term => message.includes(term));
};

const isEventTypeQuery = (message) => {
  const typeTerms = ['meeting', 'mission', 'reservation'];
  return typeTerms.some(term => message.includes(term));
};

const isUpcomingEventsQuery = (message) => {
  const upcomingTerms = ['upcoming', 'next', 'scheduled', 'planned', 'future', 'coming'];
  return upcomingTerms.some(term => message.includes(term));
};

const isEventDetailsQuery = (message) => {
  const detailTerms = ['details', 'information', 'about', 'location', 'description'];
  return detailTerms.some(term => message.includes(term));
};

const isEventStatusQuery = (message) => {
  const statusTerms = ['status', 'approved', 'pending', 'declined'];
  return statusTerms.some(term => message.includes(term));
};

const isEventParticipantsQuery = (message) => {
  const participantTerms = ['who', 'participants', 'attending', 'involved', 'people'];
  return participantTerms.some(term => message.includes(term));
};
const getEventStatus = async (userId, message) => {
  try {
    // Try to extract status type from the message
    let statusType = 'all';
    if (message.includes('pending')) {
      statusType = 'pending';
    } else if (message.includes('approved')) {
      statusType = 'approved';
    } else if (message.includes('declined')) {
      statusType = 'declined';
    }
    
    // Build query based on status type
    const today = new Date();
    let statusQuery = {
      $or: [
        { 'usersInvolved.userId': userId },
        { createdBy: userId }
      ],
      startDateTime: { $gte: today }
    };
    
    if (statusType !== 'all') {
      statusQuery.status = statusType;
    }
    
    // Find events with the specified status
    const events = await CalendarEvent.find(statusQuery)
      .sort({ startDateTime: 1 })
      .limit(5);
    
    if (events.length === 0) {
      return `You don't have any ${statusType !== 'all' ? statusType : ''} events scheduled.`;
    }
    
    // Format response
    if (statusType !== 'all') {
      const eventList = events.map(event => {
        const startDate = new Date(event.startDateTime).toDateString();
        return `- ${event.title} (${startDate}, ${event.eventType})`;
      }).join('\n');
      
      return `You have ${events.length} ${statusType} events:\n${eventList}`;
    } else {
      // Group events by status
      const eventsByStatus = {
        pending: events.filter(e => e.status === 'pending'),
        approved: events.filter(e => e.status === 'approved'),
        declined: events.filter(e => e.status === 'declined')
      };
      
      let response = `You have ${events.length} upcoming events with the following statuses:\n`;
      
      for (const [status, statusEvents] of Object.entries(eventsByStatus)) {
        if (statusEvents.length > 0) {
          response += `\n${status.charAt(0).toUpperCase() + status.slice(1)} (${statusEvents.length}):\n`;
          const eventList = statusEvents.map(event => {
            const startDate = new Date(event.startDateTime).toDateString();
            return `- ${event.title} (${startDate})`;
          }).join('\n');
          response += eventList + '\n';
        }
      }
      
      return response;
    }
  } catch (error) {
    console.error('Error fetching event status:', error);
    return `I couldn't retrieve the event status information. Please try again later.`;
  }
};

// Get information about event participants
const getEventParticipants = async (userId, message) => {
  try {
    // Try to extract an event title from the message
    let eventTitle = extractEventTitle(message);
    let eventQuery = {
      $or: [
        { 'usersInvolved.userId': userId },
        { createdBy: userId }
      ]
    };
    
    // If an event title was found, add it to the query
    if (eventTitle) {
      eventQuery.title = { $regex: eventTitle, $options: 'i' };
    }
    
    // Find the relevant event
    const event = await CalendarEvent.findOne(eventQuery)
      .sort({ startDateTime: 1 })
      .populate('usersInvolved.userId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');
    
    if (!event) {
      return `I couldn't find any events matching your query. Please try again with a more specific event name.`;
    }
    
    // Format response with participant information
    let response = `Participants for "${event.title}":\n\n`;
    response += `Organizer: ${event.createdBy.firstName} ${event.createdBy.lastName}\n\n`;
    
    if (event.usersInvolved && event.usersInvolved.length > 0) {
      response += `Invitees:\n`;
      
      // Group participants by status
      const participantsByStatus = {
        accepted: event.usersInvolved.filter(u => u.status === 'accepted'),
        pending: event.usersInvolved.filter(u => u.status === 'pending'),
        declined: event.usersInvolved.filter(u => u.status === 'declined')
      };
      
      for (const [status, users] of Object.entries(participantsByStatus)) {
        if (users.length > 0) {
          response += `\n${status.charAt(0).toUpperCase() + status.slice(1)}:\n`;
          const userList = users.map(u => {
            const user = u.userId;
            return `- ${user.firstName} ${user.lastName}`;
          }).join('\n');
          response += userList + '\n';
        }
      }
    } else {
      response += `No other participants invited.`;
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching event participants:', error);
    return `I couldn't retrieve the event participant information. Please try again later.`;
  }
};

// Get general event information
const getGeneralEventInfo = async (userId) => {
  try {
    const today = new Date();
    
    // Get quick summary of upcoming events
    const upcomingEvents = await CalendarEvent.find({
      $or: [
        { 'usersInvolved.userId': userId },
        { createdBy: userId }
      ],
      startDateTime: { $gte: today }
    }).sort({ startDateTime: 1 }).limit(3);
    
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayEvents = upcomingEvents.filter(event => 
      event.startDateTime <= todayEnd
    );
    
    const pendingEvents = await CalendarEvent.countDocuments({
      $or: [
        { 'usersInvolved.userId': userId, 'usersInvolved.status': 'pending' },
        { createdBy: userId, status: 'pending' }
      ],
      startDateTime: { $gte: today }
    });
    
    // Build the response
    let response = "";
    
    if (todayEvents.length > 0) {
      response += `You have ${todayEvents.length} event(s) today. `;
      if (todayEvents.length === 1) {
        const event = todayEvents[0];
        const startTime = new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        response += `"${event.title}" at ${startTime}. `;
      }
    } else {
      response += "You don't have any events scheduled for today. ";
    }
    
    if (upcomingEvents.length > 0 && upcomingEvents.length > todayEvents.length) {
      const nextNonTodayEvent = upcomingEvents.find(event => event.startDateTime > todayEnd);
      if (nextNonTodayEvent) {
        const eventDate = new Date(nextNonTodayEvent.startDateTime).toDateString();
        response += `Your next upcoming event is "${nextNonTodayEvent.title}" on ${eventDate}. `;
      }
    }
    
    if (pendingEvents > 0) {
      response += `You have ${pendingEvents} pending event invitation(s) or request(s). `;
    }
    
    response += "\n\nWhat would you like to know about your events? You can ask about events on specific dates, event details, or event participants.";
    
    return response;
  } catch (error) {
    console.error('Error fetching general event info:', error);
    return "I can help you with information about your events. You can ask about upcoming events, events on specific dates, or specific event details.";
  }
};

// Helper function to extract event title from a message
const extractEventTitle = (message) => {
  // Look for quoted titles
  const quoteMatch = message.match(/"([^"]+)"/);
  if (quoteMatch) {
    return quoteMatch[1];
  }
  
  // Look for titles after specific phrases
  const phraseMatches = [
    /about\s+(?:the\s+)?([^?.]+)/i,
    /details\s+(?:of|for|about)\s+(?:the\s+)?([^?.]+)/i,
    /information\s+(?:on|about)\s+(?:the\s+)?([^?.]+)/i
  ];
  
  for (const pattern of phraseMatches) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
};

// Get events for a specific date or time range
const getSpecificDateEvents = async (userId, message) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let targetDate, targetEndDate, dateDescription;
    
    // Determine the target date range based on message
    if (message.includes('today')) {
      targetDate = new Date(today);
      targetEndDate = new Date(today);
      targetEndDate.setHours(23, 59, 59, 999);
      dateDescription = 'today';
    } else if (message.includes('tomorrow')) {
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 1);
      targetEndDate = new Date(targetDate);
      targetEndDate.setHours(23, 59, 59, 999);
      dateDescription = 'tomorrow';
    } else if (message.includes('this week')) {
      targetDate = new Date(today);
      targetEndDate = new Date(today);
      targetEndDate.setDate(targetEndDate.getDate() + (7 - targetEndDate.getDay()));
      targetEndDate.setHours(23, 59, 59, 999);
      dateDescription = 'this week';
    } else if (message.includes('next week')) {
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + (7 - targetDate.getDay()) + 1);
      targetEndDate = new Date(targetDate);
      targetEndDate.setDate(targetEndDate.getDate() + 6);
      targetEndDate.setHours(23, 59, 59, 999);
      dateDescription = 'next week';
    } else if (message.includes('weekend')) {
      targetDate = new Date(today);
      const daysUntilSaturday = (6 - targetDate.getDay() + 7) % 7;
      targetDate.setDate(targetDate.getDate() + daysUntilSaturday);
      targetEndDate = new Date(targetDate);
      targetEndDate.setDate(targetEndDate.getDate() + 1); // Sunday
      targetEndDate.setHours(23, 59, 59, 999);
      dateDescription = 'this weekend';
    } else if (message.includes('month')) {
      targetDate = new Date(today);
      targetEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      targetEndDate.setHours(23, 59, 59, 999);
      dateDescription = 'this month';
    } else {
      // Default to today
      targetDate = new Date(today);
      targetEndDate = new Date(today);
      targetEndDate.setHours(23, 59, 59, 999);
      dateDescription = 'today';
    }
    
    // Find events in the target date range
    const events = await CalendarEvent.find({
      $or: [
        { 'usersInvolved.userId': userId },
        { createdBy: userId }
      ],
      startDateTime: { $gte: targetDate, $lte: targetEndDate }
    }).sort({ startDateTime: 1 });
    
    if (events.length === 0) {
      return `You don't have any events scheduled for ${dateDescription}.`;
    }
    
    // Format response based on number of events
    if (events.length === 1) {
      const event = events[0];
      const startTime = new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (event.eventType === 'meeting') {
        return `You have one meeting ${dateDescription}: "${event.title}" at ${startTime}${event.location ? ` in ${event.location}` : ''}.`;
      } else if (event.eventType === 'mission') {
        return `You have one mission ${dateDescription}: "${event.title}" starting at ${startTime}${event.destination ? ` to ${event.destination}` : ''}.`;
      } else {
        return `You have one event ${dateDescription}: "${event.title}" at ${startTime}.`;
      }
    } else {
      let formattedEvents = events.map(event => {
        const startTime = new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${event.title} (${startTime}, ${event.eventType})`;
      }).join('\n- ');
      
      return `You have ${events.length} events scheduled for ${dateDescription}:\n- ${formattedEvents}`;
    }
  } catch (error) {
    console.error('Error fetching specific date events:', error);
    return `I couldn't retrieve your events for the requested date. Please try again later.`;
  }
};

// Get events by type (meeting, mission, resource reservation)
const getEventsByType = async (userId, message) => {
  try {
    let eventType, typeDescription;
    
    // Determine the event type based on message
    if (message.includes('meeting')) {
      eventType = 'meeting';
      typeDescription = 'meetings';
    } else if (message.includes('mission')) {
      eventType = 'mission';
      typeDescription = 'missions';
    } else if (message.includes('reservation')) {
      eventType = 'resourceReservation';
      typeDescription = 'resource reservations';
    } else {
      // Default to all types
      return await getUpcomingEvents(userId, message);
    }
    
    // Find events of the specified type
    const today = new Date();
    const events = await CalendarEvent.find({
      $or: [
        { 'usersInvolved.userId': userId },
        { createdBy: userId }
      ],
      eventType: eventType,
      startDateTime: { $gte: today }
    }).sort({ startDateTime: 1 }).limit(5);
    
    if (events.length === 0) {
      return `You don't have any upcoming ${typeDescription} scheduled.`;
    }
    
    // Format response based on event type
    if (events.length === 1) {
      const event = events[0];
      const startDate = new Date(event.startDateTime).toDateString();
      const startTime = new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (eventType === 'meeting') {
        return `Your next meeting "${event.title}" is scheduled for ${startDate} at ${startTime}${event.location ? ` in ${event.location}` : ''}.`;
      } else if (eventType === 'mission') {
        const endDate = new Date(event.endDateTime).toDateString();
        return `Your next mission "${event.title}" is scheduled from ${startDate} to ${endDate}${event.destination ? `. Destination: ${event.destination}` : ''}.`;
      } else {
        return `Your next resource reservation "${event.title}" is scheduled for ${startDate} at ${startTime}.`;
      }
    } else {
      const nextEvent = events[0];
      const startDate = new Date(nextEvent.startDateTime).toDateString();
      const startTime = new Date(nextEvent.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return `You have ${events.length} upcoming ${typeDescription}. The next one is "${nextEvent.title}" on ${startDate} at ${startTime}.`;
    }
  } catch (error) {
    console.error('Error fetching events by type:', error);
    return `I couldn't retrieve your events. Please try again later.`;
  }
};

// Get upcoming events
const getUpcomingEvents = async (userId, message) => {
  try {
    const today = new Date();
    const events = await CalendarEvent.find({
      $or: [
        { 'usersInvolved.userId': userId },
        { createdBy: userId }
      ],
      startDateTime: { $gte: today }
    }).sort({ startDateTime: 1 }).limit(5);
    
    if (events.length === 0) {
      return `You don't have any upcoming events scheduled.`;
    }
    
    // Check if the request is for the next event
    if (message.includes('next')) {
      const nextEvent = events[0];
      const startDate = new Date(nextEvent.startDateTime).toDateString();
      const startTime = new Date(nextEvent.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (nextEvent.eventType === 'meeting') {
        return `Your next event is a meeting: "${nextEvent.title}" on ${startDate} at ${startTime}${nextEvent.location ? ` in ${nextEvent.location}` : ''}.`;
      } else if (nextEvent.eventType === 'mission') {
        const endDate = new Date(nextEvent.endDateTime).toDateString();
        return `Your next event is a mission: "${nextEvent.title}" from ${startDate} to ${endDate}${nextEvent.destination ? `. Destination: ${nextEvent.destination}` : ''}.`;
      } else {
        return `Your next event is a resource reservation: "${nextEvent.title}" on ${startDate} at ${startTime}.`;
      }
    } else {
      const eventList = events.map(event => {
        const startDate = new Date(event.startDateTime).toDateString();
        const startTime = new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `- ${event.title} (${startDate}, ${startTime}, ${event.eventType})`;
      }).join('\n');
      
      return `Your upcoming events (next ${events.length}):\n${eventList}`;
    }
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return `I couldn't retrieve your upcoming events. Please try again later.`;
  }
};

// Get details for a specific event
const getEventDetails = async (userId, message) => {
  try {
    // Try to extract an event title from the message
    let eventTitle = extractEventTitle(message);
    let eventQuery = {
      $or: [
        { 'usersInvolved.userId': userId },
        { createdBy: userId }
      ]
    };
    
    // If an event title was found, add it to the query
    if (eventTitle) {
      eventQuery.title = { $regex: eventTitle, $options: 'i' };
    }
    
    // Find the relevant event(s)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = await CalendarEvent.find(eventQuery)
      .sort({ startDateTime: 1 })
      .limit(3);
    
    if (events.length === 0) {
      return `I couldn't find any events matching your query. Please try again with a more specific event name.`;
    }
    
    // Return details for the most relevant event
    const event = events[0];
    const startDate = new Date(event.startDateTime).toDateString();
    const startTime = new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(event.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let details = `Event: "${event.title}"\n`;
    details += `Type: ${event.eventType}\n`;
    details += `Date: ${startDate}\n`;
    details += `Time: ${startTime} to ${endTime}\n`;
    
    if (event.location) {
      details += `Location: ${event.location}\n`;
    }
    
    if (event.destination) {
      details += `Destination: ${event.destination}\n`;
    }
    
    if (event.description) {
      details += `Description: ${event.description}\n`;
    }
    
    details += `Status: ${event.status}`;
    
    return details;
  } catch (error) {
    console.error('Error fetching event details:', error);
    return `I couldn't retrieve the event details. Please try again later.`;
  }
};

// user information handler
const getUserInfo = async (userId, message) => {
  try {
    // Get current user's info
    const currentUser = await User.findById(userId).populate('departmentId');
    message = message.toLowerCase();
    
    // If asking about themselves
    if (message.includes('my profile') || message.includes('my info') || 
        (message.includes('me') && !message.includes('meeting'))) {
      return `Your profile: ${currentUser.firstName} ${currentUser.lastName}, ${currentUser.position} in ${currentUser.departmentId?.name || 'Unknown'} department. Contact: ${currentUser.email}, ${currentUser.phone}.`;
    }
    
    // If asking about a manager
    if (message.includes('manager') || message.includes('boss') || message.includes('supervisor')) {
      if (!currentUser.managerId) return "You don't have a manager assigned in the system.";
      
      const manager = await User.findById(currentUser.managerId);
      if (!manager) return "Your manager information is not available.";
      
      return `Your manager is ${manager.firstName} ${manager.lastName}, ${manager.position}. Contact: ${manager.email}, ${manager.phone}.`;
    }
    
    // If asking about a specific colleague (improved name extraction)
    const namePattern = /(?:about|find|for|named|contact|who is)\s+([a-zA-Z]+\s*[a-zA-Z]*)/i;
    const match = message.match(namePattern);
    
    if (match && match[1]) {
      const potentialName = match[1].trim();
      const nameParts = potentialName.split(' ');
      
      // Build a more flexible query
      const query = {
        $or: [
          { firstName: { $regex: new RegExp(potentialName, 'i') }},
          { lastName: { $regex: new RegExp(potentialName, 'i') }},
          { email: { $regex: new RegExp(potentialName, 'i') }}
        ]
      };
      
      // Add search by first and last name if applicable
      if (nameParts.length > 1) {
        query.$or.push({ 
          firstName: { $regex: new RegExp(nameParts[0], 'i') },
          lastName: { $regex: new RegExp(nameParts[1], 'i') }
        });
      }
      
      const colleague = await User.findOne(query).populate('departmentId');
      
      if (colleague) {
        return `${colleague.firstName} ${colleague.lastName}: ${colleague.position} in ${colleague.departmentId?.name || 'Unknown'} department. Contact: ${colleague.email}, ${colleague.phone}${colleague.skills?.length ? '. Skills: ' + colleague.skills.join(', ') : ''}.`;
      } else {
        return `No colleague named "${potentialName}" found in our system.`;
      }
    }
    
    // If asking about team members
    if (message.includes('team') || message.includes('colleagues')) {
      if (!currentUser.departmentId) return "You don't have a department assigned, so I can't list your colleagues.";
      
      const colleagues = await User.find({
        departmentId: currentUser.departmentId._id,
        _id: { $ne: userId } // Exclude current user
      }).limit(8); // Reduced limit for brevity
      
      if (colleagues.length === 0) return `You don't have any other colleagues listed in the ${currentUser.departmentId.name} department.`;
      
      const colleaguesList = colleagues.map(c => `${c.firstName} ${c.lastName} (${c.position})`).join(', ');
      return `Your colleagues in ${currentUser.departmentId.name}: ${colleaguesList}.`;
    }
    
    // Default response
    return `Your profile: ${currentUser.firstName} ${currentUser.lastName}, ${currentUser.position} in ${currentUser.departmentId?.name || 'Unknown'} department. Contact: ${currentUser.email}, ${currentUser.phone}.`;
  } catch (error) {
    console.error('Error fetching user information:', error);
    return "I couldn't retrieve the user information. Please try again later.";
  }
};

// Enhanced department information handler
const getDepartmentInfo = async (userId, message) => {
    
try {
  // Get user's department
  const user = await User.findById(userId).populate('departmentId');
  
  if (!user.departmentId) {
    return "You don't have a department assigned in the system.";
  }
  
  // Get department details including manager and employees
  const department = await Department.findById(user.departmentId._id)
    .populate('managerId')
    .populate('employees');
  
  // Check for specific queries
  if (message.includes('manager') || message.includes('head')) {
    if (department.managerId) {
      return `The manager of the ${department.name} department is ${department.managerId.firstName} ${department.managerId.lastName}. Contact: ${department.managerId.email}, ${department.managerId.phone}.`;
    } else {
      return `The ${department.name} department currently doesn't have a manager assigned.`;
    }
  }
  
  if (message.includes('members') || message.includes('employees') || message.includes('staff') || message.includes('team')) {
    if (department.employees && department.employees.length > 0) {
      const employeeCount = department.employees.length;
      const employeeList = department.employees.slice(0, 5).map(emp => 
        `${emp.firstName} ${emp.lastName} (${emp.position})`
      ).join(', ');
      
      let response = `The ${department.name} department has ${employeeCount} employee(s).`;
      if (employeeCount > 5) {
        response += ` Some team members include: ${employeeList} and ${employeeCount - 5} more.`;
      } else {
        response += ` Team members: ${employeeList}.`;
      }
      return response;
    } else {
      return `The ${department.name} department doesn't have any employees listed.`;
    }
  }
  
  // Default department overview
  let response = `Department: ${department.name}. `;
  
  if (department.managerId) {
    response += `Manager: ${department.managerId.firstName} ${department.managerId.lastName}. `;
  }
  
  const employeeCount = department.employees ? department.employees.length : 0;
  response += `Number of employees: ${employeeCount}.`;
  
  return response;
} catch (error) {
  console.error('Error fetching department information:', error);
  return "I couldn't retrieve the department information. Please try again later.";
}
};

// Resource information handler
const getResourceInfo = async (userId, message) => {
   
try {
  // Check for specific resource types
  const resourceTypePattern = new RegExp(companyKnowledge.resourceTypes.join('|'), 'i');
  const typeMatch = message.match(resourceTypePattern);
  
  let resourceType = null;
  if (typeMatch) {
    resourceType = typeMatch[0].toLowerCase();
  }
  
  // If asking about availability
  if (message.includes('available') || message.includes('free') || message.includes('can i use')) {
    let query = { status: 'available' };
    
    if (resourceType) {
      query.type = resourceType;
    }
    
    const availableResources = await Resource.find(query).limit(10);
    
    if (availableResources.length === 0) {
      return resourceType ? 
        `There are no available ${resourceType}s at the moment.` : 
        "There are no available resources at the moment.";
    }
    
    const resourceList = availableResources.map(res => `${res.name} (${res.type})`).join(', ');
    
    return resourceType ?
      `Available ${resourceType}s: ${resourceList}` :
      `Available resources: ${resourceList}`;
  }
  
  // If asking about a specific resource by name
  const namePattern = /(?:about|find|for|named|status of)\s+([a-zA-Z0-9]+\s*[a-zA-Z0-9]*)/i;
  const nameMatch = message.match(namePattern);
  
  if (nameMatch && nameMatch[1]) {
    const resourceName = nameMatch[1].trim();
    const resource = await Resource.findOne({
      name: { $regex: new RegExp(resourceName, 'i') }
    });
    
    if (resource) {
      return `Resource ${resource.name} (${resource.type}) is currently ${resource.status}. ${resource.description ? `Description: ${resource.description}` : ''}`;
    } else {
      return `I couldn't find a resource named "${resourceName}" in our system.`;
    }
  }
  
  // If asking about specific resource types
  if (resourceType) {
    const resources = await Resource.find({ type: resourceType }).limit(10);
    
    if (resources.length === 0) {
      return `There are no ${resourceType}s registered in the system.`;
    }
    
    const availableCount = resources.filter(res => res.status === 'available').length;
    const resourceList = resources.map(res => `${res.name} (${res.status})`).join(', ');
    
    return `${resources.length} ${resourceType}(s) found, ${availableCount} available: ${resourceList}`;
  }
  
  // Default response with resource summary
  const resourceCounts = await Resource.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);
  
  const availableCounts = await Resource.aggregate([
    { $match: { status: 'available' } },
    { $group: { _id: '$type', available: { $sum: 1 } } }
  ]);
  
  // Create a map of available resources
  const availableMap = {};
  availableCounts.forEach(item => {
    availableMap[item._id] = item.available;
  });
  
  const resourceSummary = resourceCounts.map(item => 
    `${item._id}: ${availableMap[item._id] || 0} out of ${item.count} available`
  ).join(', ');
  
  return `Resource summary: ${resourceSummary}`;
} catch (error) {
  console.error('Error fetching resource information:', error);
  return "I couldn't retrieve the resource information. Please try again later.";
}
};

// Attendance information handler
const getAttendanceInfo = async (userId, message) => {
    
    try {
      const today = new Date();
      // Check if asking about today
      if (message.includes('today')) {
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayAttendance = await Attendance.findOne({
          userId: userId,
          date: {
            $gte: todayStart,
            $lt: today
          }
        });
        if (!todayAttendance) {
          return "You haven't checked in today yet.";
        }
        let response = `You checked in today at ${todayAttendance.checkIn.toLocaleTimeString()}.`;
        if (todayAttendance.checkOut) {
          response += ` You checked out at ${todayAttendance.checkOut.toLocaleTimeString()}.`;
        } else {
          response += " You haven't checked out yet.";
        }
        if (todayAttendance.status === 'Late') {
          response += ` You were ${todayAttendance.lateBy} minutes late today.`;
        }
        if (todayAttendance.productionHours > 0) {
          response += ` Your productive hours today: ${todayAttendance.productionHours}.`;
        }
        return response;
      }
      // Check if asking about weekly report
      if (message.includes('week') || message.includes('weekly')) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weeklyAttendance = await Attendance.find({
          userId: userId,
          date: {
            $gte: weekStart,
            $lt: today
          }
        });
        if (weeklyAttendance.length === 0) {
          return "No attendance records found for this week.";
        }
        const daysPresent = weeklyAttendance.filter(a => a.status === 'Present').length;
        const daysLate = weeklyAttendance.filter(a => a.status === 'Late').length;
        const totalProductionHours = weeklyAttendance.reduce((sum, a) => sum + (a.productionHours || 0), 0);
        return `This week's attendance: ${daysPresent} days present, ${daysLate} days late. Total production hours: ${totalProductionHours.toFixed(2)}.`;
      }
      
      // Check if asking about monthly report
      if (message.includes('month') || message.includes('monthly')) {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthAttendance = await Attendance.find({
          userId: userId,
          date: {
            $gte: monthStart,
            $lt: today
          }
        });
        
        if (monthAttendance.length === 0) {
          return "No attendance records found for this month.";
        }
        
        const daysPresent = monthAttendance.filter(a => a.status === 'Present').length;
        const daysLate = monthAttendance.filter(a => a.status === 'Late').length;
        const daysAbsent = monthAttendance.filter(a => a.status === 'Absent').length;
        const totalProductionHours = monthAttendance.reduce((sum, a) => sum + (a.productionHours || 0), 0);
        
        return `This month's attendance: ${daysPresent} days present, ${daysLate} days late, ${daysAbsent} days absent. Total production hours: ${totalProductionHours.toFixed(2)}.`;
      }
      
      // Default response for general attendance inquiry
      const lastAttendance = await Attendance.findOne({ userId: userId }).sort({ date: -1 });
      
      if (!lastAttendance) {
        return "No attendance records found.";
      }
      
      return `Your last recorded attendance was on ${lastAttendance.date.toLocaleDateString()}. Status: ${lastAttendance.status}.`;
    } catch (error) {
      console.error("Error retrieving attendance info:", error);
      return "Sorry, I couldn't retrieve your attendance information at this time.";
    }
  };
  // Store conversation history in memory (replace with database in production)
  const chatHistory = {};


// Main controller method for sending messages
exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    
    // Determine query type and get appropriate response
    const queryType = determineQueryType(message);
    let response = '';
    
    try {
      // If it's a leave-related query, use the new handleLeaveQueries function
      if (queryType === 'leaveInfo' || queryType === 'leaveRequestStatus') {
        response = await handleLeaveQueries(userId, message);}
      else if (queryType === 'eventInfo') {
        response = await handleEventQueries(userId, message);
      }else {
        // Handle other query types as before
        switch (queryType) {
          case 'leaveRequestStatus':
            response = await getLeaveRequestStatus(userId, message);
            break;
          case 'eventInfo':
            response = await getEventInfo(userId, message);
            break;
          case 'userInfo':
            response = await getUserInfo(userId, message);
            break;
          case 'departmentInfo':
            response = await getDepartmentInfo(userId, message);
            break;
          case 'resourceInfo':
            response = await getResourceInfo(userId, message);
            break;
          case 'attendanceInfo':
            response = await getAttendanceInfo(userId, message);
            break;
          case 'profileInfo':
            response = await getUserInfo(userId, message);
            break;
          case 'workHoursInfo':
            response = companyKnowledge.workHours;
            break;
          case 'salaryInfo':
            response = "For salary information, please contact HR.";
            break;
          default:
            response = getStaticResponse(message);
        }
      }
    } catch (innerError) {
      console.error(`Error in ${queryType} handling:`, innerError);
      throw innerError;
    }
    
    // Save message to history
    if (!chatHistory[userId]) {
      chatHistory[userId] = [];
    }
    
    // Save user message
    const userMessage = {
      sender: 'user',
      content: message,
      timestamp: new Date()
    };
    
    // Save bot response
    const botMessage = {
      sender: 'bot',
      content: response,
      timestamp: new Date()
    };
    
    chatHistory[userId].push(userMessage);
    chatHistory[userId].push(botMessage);
    
    // Limit history to last 100 messages
    if (chatHistory[userId].length > 100) {
      chatHistory[userId] = chatHistory[userId].slice(-100);
    }
    
    // Create a chat message record in the database
    await ChatMessage.create({
      userId: userId,
      message: message,
      response: response,
      timestamp: new Date()
    });
    
    return res.status(200).json({
      success: true,
      message: response
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return res.status(500).json({
      success: false,
      message: 'Sorry, I encountered an error processing your request. Please try again later.'
    });
  }
};

// Get conversation history
exports.getConversationHistory = async (req, res) => {
  try {
    const userId = req.user.id; 
    const limit = parseInt(req.query.limit) || 50; // Default to 50 messages
    
    // Get chat history from database
    const messages = await ChatMessage.find({ userId: userId })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    // Transform to the format expected by frontend
    const history = messages.map(msg => ([
      {
        sender: 'user',
        content: msg.message,
        timestamp: msg.timestamp
      },
      {
        sender: 'bot',
        content: msg.response,
        timestamp: msg.timestamp
      }
    ])).flat().sort((a, b) => a.timestamp - b.timestamp);
    
    return res.status(200).json({
      success: true,
      history: history
    });
  } catch (error) {
    console.error('Error in getConversationHistory:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving conversation history'
    });
  }
};