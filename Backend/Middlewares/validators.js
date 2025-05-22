const { body, validationResult } = require('express-validator');

// Validation rules for adding a user
const addUserValidationRules = [
  body('firstName')
    .notEmpty().withMessage('First name is required.')
    .matches(/^[A-Za-z\s]+$/).withMessage('First name should only contain letters.'),
  
  body('lastName')
    .notEmpty().withMessage('Last name is required.')
    .matches(/^[A-Za-z\s]+$/).withMessage('Last name should only contain letters.'),
  
  body('email')
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email format.'),
  
  body('phone')
    .notEmpty().withMessage('Phone number is required.')
    .matches(/^\d+$/).withMessage('Phone number should only contain numbers.')
    .isLength({ min: 8, max: 8 }).withMessage('Phone number must be exactly 8 digits long.'),
  
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  
  body('role')
    .notEmpty().withMessage('Role is required.'),
  
  body('position')
    .notEmpty().withMessage('Position is required.'),
  
  body('personalEmail')
    .notEmpty().withMessage('Personal email is required.')
    .isEmail().withMessage('Invalid personal email format.'),
  
  body('salary')
    .notEmpty().withMessage('Salary is required.')
    .isFloat({ min: 0.01 }).withMessage('Salary must be a positive number greater than zero.'),
    
  body('hireDate')
    .notEmpty().withMessage('Hire date is required.')
    .custom(value => {
      const hireDate = new Date(value);
      const today = new Date();
      
      // Remove time part for comparison (set to midnight)
      today.setHours(0, 0, 0, 0);
      
      if (hireDate > today) {
        throw new Error('Hire date cannot be in the future.');
      }
      return true;
    }),
];

// Validation rules for updating a user
const updateUserValidationRules = [
  body('firstName')
    .optional()
    .matches(/^[A-Za-z\s]+$/).withMessage('First name should only contain letters.'),
  
  body('lastName')
    .optional()
    .matches(/^[A-Za-z\s]+$/).withMessage('Last name should only contain letters.'),
  
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format.'),
  
  body('phone')
    .optional()
    .matches(/^\d+$/).withMessage('Phone number should only contain numbers.'),
  
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  
  body('position')
    .optional()
    .notEmpty().withMessage('Position cannot be empty if provided.'),
  
  body('personalEmail')
    .optional()
    .isEmail().withMessage('Invalid personal email format.'),
  
  body('salary')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Salary must be a positive number greater than zero.'),

  body('hireDate')
    .optional()
    .custom(value => {
      if (!value) return true; // Skip validation if empty
      
      const hireDate = new Date(value);
      const today = new Date();
      
      // Remove time part for comparison (set to midnight)
      today.setHours(0, 0, 0, 0);
      
      if (hireDate > today) {
        throw new Error('Hire date cannot be in the future.');
      }
      return true;
    }),
];

// Validation rules for updating user profile
const updateProfileValidationRules = [
  body('firstName')
    .optional()
    .matches(/^[A-Za-z\s]+$/).withMessage('First name should only contain letters.'),
  
  body('lastName')
    .optional()
    .matches(/^[A-Za-z\s]+$/).withMessage('Last name should only contain letters.'),
  
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format.'),
  
  body('phone')
    .optional()
    .matches(/^\d+$/).withMessage('Phone number should only contain numbers.'),
  
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    
  body('currentPassword')
    .if(body('password').exists())
    .notEmpty()
    .withMessage('Current password is required when changing password.')
];

// Validation rules for password reset
const resetPasswordValidationRules = [
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// Middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return all validation errors at once
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  addUserValidationRules,
  updateUserValidationRules,
  updateProfileValidationRules,
  resetPasswordValidationRules,
  validate
};