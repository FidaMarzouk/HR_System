const User = require('../Models/User');
const LeaveRequest = require("../Models/LeaveRequest");
const Department = require('../Models/Department');
const bcrypt = require('bcrypt');
const path = require('path');
const leaveHelper = require('../Middlewares/leaveCalculationHelper');
const emailService = require('../Controllers/emailService');
require('dotenv').config();

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    let updateData = { ...req.body };
    
    // Check for existing email
    if (updateData.email) {
      const existingUser = await User.findOne({ 
        email: updateData.email, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use by another account' });
      }
    }
    
    // Handle profile picture upload if provided
    if (req.file) {
      updateData.profilePicture = `/uploads/${req.file.filename}`;
    }
    
    // Handle skills array if it comes as a string
    if (typeof updateData.skills === 'string') {
      updateData.skills = JSON.parse(updateData.skills);
    }
    
    // Handle password update if provided
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      delete updateData.password; // Don't update password if not provided
    }
    
    // Fields that should not be updated by the user
    const restrictedFields = ['role', 'departmentId', 'managerId', 'salary', 'leaveRequestAllowed', 'remainingLeaveDays'];
    restrictedFields.forEach(field => delete updateData[field]);
    
    // Update the user data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');
    
    res.status(200).json(updatedUser);
    
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password')
    .populate({
      path: 'departmentId',
      select: 'name'
    });
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
exports.getAdmin = async (req, res) => {
  try {
    const admin = await User.findOne({ role: 'admin' })
      .select('firstName lastName');
    
    if (!admin) {
      return res.status(404).json({ message: 'No admin found' });
    }
    
    res.status(200).json(admin);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
exports.getEmployeeManager = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const employee = await User.findById(employeeId).populate("managerId");
    
    // Check if employee has a manager assigned
    if (!employee.managerId) {
      return res.status(200).json([]);
    }
    
    const manager = {
      _id: employee.managerId._id,
      firstName: employee.managerId.firstName,
      lastName: employee.managerId.lastName,
    };
    
    res.status(200).json([manager]);
  } catch (err) {
    console.error("Error fetching employee's manager:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getSuperAdmin = async (req, res) => {
  try {
    const superAdmin = await User.findOne({ role: 'superAdmin' })
      .select('_id firstName lastName');
    
    if (!superAdmin) {
      return res.status(404).json({ message: "No Super Admin found" });
    }
    
    res.status(200).json(superAdmin);
  } catch (err) {
    console.error("Error fetching superadmin:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Create a new user (admin only)
exports.createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      departmentId,
      hireDate,
      salary,
      skills,
      password,
      role,
      personalEmail,
    } = req.body;

    // Check for existing user - this query needs to happen before proceeding
    const existingUser = await User.findOne({ email }, { _id: 1 });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }
    const existingPhone = await User.findOne({ phone }, { _id: 1 });
    if (existingPhone) {
      return res.status(400).json({ message: "User with this phone number already exists" });
    }

    // Save original password for email
    const originalPassword = password || "defaultPassword123";
    const accrualInfo = { totalAccruedDays: leaveHelper.calculateAccruedLeaveDays(hireDate) };
    
    // Create the base user object
    const userObj = {
      firstName,
      lastName,
      email,
      phone,
      position,
      departmentId,
      hireDate,
      salary: salary || 0, // Default to 0 if not provided (validator will catch this if required)
      skills: typeof skills === "string" ? skills.split(",").map(skill => skill.trim()) : skills || [],
      password: await bcrypt.hash(originalPassword, 10),
      role,
      leaveRequestAllowed: accrualInfo.totalAccruedDays,
      remainingLeaveDays: accrualInfo.totalAccruedDays,
      profilePicture: req.file ? `/uploads/${req.file.filename}` : "",
      personalEmail,
    };
 


    // Determine if we need managerId and verify department in parallel
    let departmentPromise;
    if (role === "employee" && departmentId) {
      departmentPromise = Department.findById(departmentId, { managerId: 1 });
    }

    // Start user creation while department check is pending
    const user = new User(userObj);
    
    // Wait for department info if needed
    if (departmentPromise) {
      const department = await departmentPromise;
      if (department && department.managerId) {
        // Only query manager data if department has a managerId
        const manager = await User.findById(department.managerId, { role: 1 });
        if (manager && manager.role === 'manager') {
          user.managerId = department.managerId;
        }
      } else {
        return res.status(400).json({
          message: "The selected department does not have a manager assigned. Please assign a manager to the department first."
        });
      }
    }

    // Save the user
    const savedUser = await user.save();

    // Perform department update and email sending in parallel
    const tasks = [];

    // Update department based on role
    if (departmentId) {
      if (role === "manager") {
        tasks.push(Department.findByIdAndUpdate(departmentId, { managerId: savedUser._id }));
      } else if (role === "employee") {
        tasks.push(Department.findByIdAndUpdate(departmentId, {
          $addToSet: { employees: savedUser._id }
        }));
      }
    }

    // Send email asynchronously (don't wait for it)
    const emailTask = (async () => {
      try {
        const admin = await User.findOne({ role: 'admin' }, { email: 1 });
        if (admin) {
          const adminEmailPassword = process.env.ADMIN_EMAIL_PASSWORD;
          await emailService.initialize(admin.email, adminEmailPassword);
          await emailService.sendNewUserCredentials({
            ...savedUser.toObject(),
            originalPassword
          });
        }
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // Continue even if email fails
      }
    })();
    
    // Add email task but don't wait for it
    tasks.push(emailTask);

    // Fire all tasks in parallel but don't wait for them to complete
    Promise.all(tasks).catch(err => console.error("Background task error:", err));

    // Return success response immediately
    return res.status(201).json({
      message: "User created successfully",
      user: {
        ...savedUser.toObject(),
        password: undefined
      }
    });
  } catch (err) {
    console.error("Error creating user:", err);
    if (err.name === 'ValidationError') {
      const errorMessages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: errorMessages.join(', ') });
    }
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
      // Check the role of the logged-in user
      const userRole = req.user.role;

      // If the user is an admin, retrieve all users
      if (userRole === 'admin' || userRole === 'superAdmin') {
        const users = await User.find({ role: { $nin: ['admin', 'superAdmin'] } })
            .select("-password")
            .populate({
                path: "departmentId",
                select: "name"
            })
            .populate({
                path: "managerId",
                select: "firstName lastName"
            });
    
        return res.status(200).json({ users });
    }
      
      // If the user is a manager, retrieve managed employees
      if (userRole === 'manager') {
          const managerId = req.user.id;
          const employees = await User.find({ managerId: managerId }, { password: 0 })
          .populate('departmentId', 'name');
          return res.status(200).json({employees});
      }

      // If the user has neither admin nor manager role
      return res.status(403).json({ 
          message: 'Unauthorized access: Insufficient permissions' 
      });

  } catch (err) {
      console.error('Error retrieving users:', err);
      res.status(500).json({ 
          message: 'Server error', 
          error: err.message 
      });
  }
};

// Update user (admin only)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };
    const user = await User.findById(id);
    
    // Track what credentials have changed for email notification
    const changedCredentials = [];
    let originalPassword = null;
    
    // Email validation - only if it's being changed
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ email: updateData.email });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      changedCredentials.push('email');
    }
    if (updateData.phone && updateData.phone !== user.phone) {
      const existingPhone = await User.findOne({ 
        phone: updateData.phone,
        _id: { $ne: id } // Exclude current user
      });
      if (existingPhone) {
        return res.status(400).json({ message: 'User with this phone number already exists' });
      }
    }
if (updateData.hireDate && new Date(updateData.hireDate).toISOString() !== new Date(user.hireDate).toISOString()) {
  // Calculate what the leave days would be with the new hire date
  const newAccrualInfo = await leaveHelper.calculateCurrentLeaveBalance(id, LeaveRequest, User, updateData.hireDate);
  const daysAlreadyTaken = user.leaveRequestAllowed - user.remainingLeaveDays;
  
  // Logic to handle the case where new accrual is less than days already taken
  if (newAccrualInfo.totalAccruedDays < daysAlreadyTaken) {
  
    return res.status(400).json({ 
      message: `Cannot update hire date. User has already used ${daysAlreadyTaken} days, but the new hire date would only allow ${newAccrualInfo.totalAccruedDays} days.`
    });
  } else {
    // Normal case: user still has enough days with the new hire date
    updateData.leaveRequestAllowed = newAccrualInfo.totalAccruedDays;
    updateData.remainingLeaveDays = newAccrualInfo.totalAccruedDays - daysAlreadyTaken;
  }
}
    // Handle profile picture upload
    if (req.file) {
      updateData.profilePicture = `/uploads/${req.file.filename}`;
    }
    
    // Password update
    if (updateData.password) {
      originalPassword = updateData.password; // Store original for email
      updateData.password = await bcrypt.hash(updateData.password, 10);
      changedCredentials.push('password');
    }
    
    // Department change logic
    if (updateData.departmentId) {
      await handleDepartmentChange(id, user, updateData);
    } else {
      // If no departmentId provided, remove it from updateData
      delete updateData.departmentId;
      delete updateData.managerId;
    }
    
    // Convert skills string to array if needed
    if (typeof updateData.skills === 'string') {
      updateData.skills = updateData.skills.split(',').map(skill => skill.trim());
    }
    
    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true })
      .select('-password')
      .populate('departmentId', 'name employees')
      .populate('managerId', 'firstName lastName');
    
    // Send email notification in parallel (don't wait for it)
    if (changedCredentials.length > 0 && updatedUser.personalEmail) {
      sendCredentialUpdateEmail(updatedUser, changedCredentials, originalPassword)
        .catch(error => console.error("Error in email sending process:", error));
    }
    
    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Separate function for handling department changes
async function handleDepartmentChange(userId, user, updateData) {
  const newDepartment = await Department.findById(updateData.departmentId);
  const oldDepartmentId = user.departmentId ? user.departmentId.toString() : null;
  
  // Different logic based on user role
  if (updateData.role === 'manager' || (user.role === 'manager' && updateData.role !== 'employee')) {
    // User is or will be a manager
    
    // Handle old department if it exists and is different
    if (oldDepartmentId && oldDepartmentId !== updateData.departmentId.toString()) {
      const oldDepartment = await Department.findById(oldDepartmentId);
      
      if (oldDepartment && oldDepartment.managerId && 
          oldDepartment.managerId.toString() === userId) {
        
        // Update old department and its employees in one operation
        await Promise.all([
          Department.findByIdAndUpdate(oldDepartmentId, { 
            managerId: null,
            $pull: { employees: userId }
          }),
          User.updateMany(
            { departmentId: oldDepartmentId, managerId: userId },
            { managerId: null }
          )
        ]);
      }
    }
    
    // Handle new department if different from old
    if (!oldDepartmentId || oldDepartmentId !== updateData.departmentId.toString()) {
      await Promise.all([
        Department.findByIdAndUpdate(updateData.departmentId, { managerId: userId }),
        User.updateMany(
          { departmentId: updateData.departmentId, role: { $ne: 'manager' } },
          { managerId: userId }
        )
      ]);
    }
    
    // Managers don't have managers
    delete updateData.managerId;
  } else {
    // User is an employee
    
    // Set manager based on department
    if (newDepartment.managerId) {
      updateData.managerId = newDepartment.managerId;
    } else {
      updateData.managerId = null;
    }
    
    // Update department references if changing
    if (oldDepartmentId && oldDepartmentId !== updateData.departmentId.toString()) {
      await Promise.all([
        Department.findByIdAndUpdate(oldDepartmentId, { 
          $pull: { employees: userId } 
        }),
        Department.findByIdAndUpdate(updateData.departmentId, { 
          $addToSet: { employees: userId } 
        })
      ]);
    } else if (!oldDepartmentId) {
      await Department.findByIdAndUpdate(updateData.departmentId, { 
        $addToSet: { employees: userId } 
      });
    }
  }
}

// Separate function for email sending (non-blocking)
async function sendCredentialUpdateEmail(user, changedCredentials, newPassword) {
  try {
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log("No admin user found for sending emails");
      return;
    }
    
    const adminEmailPassword = process.env.ADMIN_EMAIL_PASSWORD;
    if (!adminEmailPassword) {
      console.log("ADMIN_EMAIL_PASSWORD environment variable is not set");
      return;
    }
    
    await emailService.initialize(admin.email, adminEmailPassword);
    
    await emailService.sendCredentialUpdateNotification(
      user, 
      changedCredentials,
      newPassword // Pass the actual password
    );
  } catch (error) {
    console.error("Error sending credential update email:", error);
  }
}

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    // Handle manager-specific logic before deletion
    if (user.role === 'manager') {
      // Get the department this manager was assigned to
      const department = await Department.findOne({ managerId: id });
      
      if (department) {
        // Set department's managerId to null
        await Department.findByIdAndUpdate(department._id, { 
          managerId: null 
        });
        
        // Set managerId to null for all employees who had this manager
        await User.updateMany(
          { managerId: id },
          { managerId: null }
        );
      }
    }
    
    // Remove user from department's employee list if they're in one
    if (user.departmentId) {
      await Department.findByIdAndUpdate(
        user.departmentId,
        { $pull: { employees: id } }
      );
    }
    
    // Finally delete the user
    await User.findByIdAndDelete(id);
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const currentUser = await User.findById(user.id).select('-password');
    
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data
    res.json({
      id: currentUser._id,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
      picture: currentUser.picture,
      role: currentUser.role,
      remainingLeaveDays: currentUser.remainingLeaveDays
    });
    
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

