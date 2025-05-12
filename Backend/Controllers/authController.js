const User = require('../Models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const emailService = require('./emailService');

// Login function
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for empty fields
    if (!email || !password) {
      return res.status(400).json({
        message: !email && !password
          ? 'Both email and password are required.'
          : !email
          ? 'Email is required.'
          : 'Password is required.',
      });
    }

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Compare plain text password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

    // Set token expiration explicitly - 5 hours in seconds
    const expiresIn = 5 * 60 * 60; // 5 hours in seconds
    
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn }
    );

    // Set the token as an HTTP-only cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure in production
      sameSite: 'lax',  // Changed from 'strict' to 'lax' to allow cross-site navigation
      maxAge: expiresIn * 1000, // Convert seconds to milliseconds
      path: '/' // Ensure cookie is available across your entire site
    });

    // Return user information and expiry information
    // Still send token in response for backward compatibility
    res.status(200).json({
      message: 'Login successful',
      token,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      role: user.role,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        picture: user.picture,
        id: user._id,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add logout function
exports.logout = (req, res) => {
  res.clearCookie('authToken', {
    path: '/', // Make sure to clear the cookie with the same path
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  });
  res.status(200).json();
};

// Add verify token function
exports.verifyToken = (req, res) => {
  if (req.user) {
    return res.status(200).json({ 
      authenticated: true,
      user: {
        id: req.user.id,
        role: req.user.role
      }
    });
  } else {
    return res.status(401).json({ 
      authenticated: false,
      message: 'Not authenticated' 
    });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal if the email exists or not
      return res.status(200).json({ 
        message: 'If your email is registered, you will receive a password reset link' 
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Create JWT with the hashed token
    const resetJwt = jwt.sign(
      { token: hashedToken, userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '10m' } // Token expires in 10 minutes
    );
    
    // Create reset URL
    const resetUrl = `http://localhost:5173/reset-password/${resetJwt}`;
    
    // Initialize email service and send email
    try {
      // Get admin user credentials - same pattern as in createUser
      const admin = await User.findOne({ role: 'admin' }, { email: 1 });
      
      if (admin) {
        const adminEmailPassword = process.env.ADMIN_EMAIL_PASSWORD;
        
        // Initialize email service with admin credentials
        await emailService.initialize(admin.email, adminEmailPassword);
        
        // Send reset email
        await emailService.sendPasswordResetEmail({
          email: user.personalEmail || user.email,
          firstName: user.firstName,
          resetUrl
        });
      } else {
        throw new Error('Admin user not found');
      }
      
      res.status(200).json({ 
        message: 'Password reset link sent to your email' 
      });
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      res.status(500).json({ 
        message: 'Error sending password reset email', 
        error: emailError.message 
      });
    }
  } catch (error) {
    console.error('Error in requestPasswordReset:', error);
    res.status(500).json({ 
      message: 'Error processing your request', 
      error: error.message 
    });
  }
};

// Verify Reset Token
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ message: 'Invalid token' });
    }
    
    // Verify the JWT token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Token is invalid or expired' });
    }
    
    // Check if user exists
    const user = await User.findById(decodedToken.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ 
      valid: true,
      userId: user._id,
      email: user.email
    });
  } catch (error) {
    console.error('Error in verifyResetToken:', error);
    res.status(500).json({ 
      message: 'Error processing your request', 
      error: error.message 
    });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    
    if (!password || !confirmPassword) {
      return res.status(400).json({ message: 'Both password fields are required' });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    
    // Verify the JWT token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Token is invalid or expired' });
    }
    
    // Find user
    const user = await User.findById(decodedToken.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update user's password
    user.password = hashedPassword;
    await user.save();
    
    // Send confirmation email
    await emailService.sendPasswordResetConfirmation({
      email: user.personalEmail || user.email,
      firstName: user.firstName
    });
    
    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ 
      message: 'Error processing your request', 
      error: error.message 
    });
  }
};
