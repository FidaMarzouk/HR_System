const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: String, enum: ['Employee', 'Manager', 'Admin'],},
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { 
    type: String, 
    enum: [
      'Sick Leave',
    'Vacation Leave',
    'Maternity Leave',
    'Personal Leave',
    'Emergency Leave',
    'Unpaid Leave',
    ], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Manager Approved', 'Manager Rejected', 'Admin Approved', 'Admin Rejected','CEO Approved','CEO Rejected'], 
    default: 'Pending' 
  },
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
