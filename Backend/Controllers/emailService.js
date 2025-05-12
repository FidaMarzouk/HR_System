const { createTransporter } = require('../utils/emailConfig');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  // Initialize the transporter with admin credentials
  async initialize(adminEmail, adminPassword) {
    try {
      this.transporter = await createTransporter(adminEmail, adminPassword);
      this.senderEmail = adminEmail;
      return true;
    } catch (error) {
      console.error('Error initializing email transporter:', error);
      return false;
    }
  }
  async ensureInitialized() {
    if (!this.transporter) {
      // Get admin credentials from environment variables
      const adminEmail = process.env.EMAIL_USER;
      const adminPassword = process.env.EMAIL_PASSWORD;
      
      if (!adminEmail || !adminPassword) {
        throw new Error('Email credentials not configured in environment variables');
      }
      
      console.log('Auto-initializing email transporter...');
      return this.initialize(adminEmail, adminPassword);
    }
    return true;
  }
  // Send new user credentials
  async sendNewUserCredentials(user) {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }
  
    // Add debugging
    console.log(`Attempting to send email to: ${user.personalEmail}`);
    
    const mailOptions = {
      from: this.senderEmail,
      to: user.personalEmail,
      subject: 'Welcome to HRMS - Your Account Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Welcome to HRMS, ${user.firstName}!</h2>
          <p>Your account has been created successfully. Below are your login credentials:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Password:</strong> ${user.originalPassword}</p>
          </div>
          <p>For security reasons, please change your password after your first login.</p>
          <p>If you have any questions, please contact your HR department.</p>
          <p>Best regards,<br>HRMS Team</p>
        </div>
      `
    };

    try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        return info;
      } catch (error) {
        console.error('Error sending new user credentials email:', error.message);
        // Log more detailed error information
        if (error.code) console.error(`Error code: ${error.code}`);
        if (error.command) console.error(`Failed command: ${error.command}`);
        throw error;
      }
    }

  // Send credential update notification
  async sendCredentialUpdateNotification(user, updatedFields, newPassword = null) {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }
    
    console.log(`Preparing credential update email for: ${user.personalEmail}`);
    
    // Check if any credentials were actually updated
    if (!updatedFields || updatedFields.length === 0) {
      console.log('No credentials were updated, skipping email notification');
      return null;
    }
  
    let changedCredentialsText = '';
    if (updatedFields.includes('email')) {
      changedCredentialsText += `<p><strong>New Email:</strong> ${user.email}</p>`;
    }
    
    if (updatedFields.includes('password') && newPassword) {
      changedCredentialsText += `<p><strong>New Password:</strong> ${newPassword}</p>`;
    } else if (updatedFields.includes('password')) {
      changedCredentialsText += `<p><strong>Password:</strong> Your password has been updated</p>`;
    }
    
    // If no changes to report, don't send email
    if (!changedCredentialsText) {
      console.log('No credential changes to report in email');
      return null;
    }
  
    const mailOptions = {
      from: this.senderEmail,
      to: user.personalEmail,
      subject: 'HRMS - Your Account Credentials Have Been Updated',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Credential Update Notification</h2>
          <p>Hello ${user.firstName},</p>
          <p>Your HRMS account credentials have been updated. Here are the changes:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            ${changedCredentialsText}
          </div>
          <p>If you did not request these changes, please contact your HR department immediately.</p>
          <p>Best regards,<br>HRMS Team</p>
        </div>
      `
    };
  
    try {
      console.log('Attempting to send credential update email...');
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Update email sent successfully:', info.response);
      return info;
    } catch (error) {
      console.error('Error sending credential update notification:', error);
      console.error('Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  }
  async sendPasswordResetEmail({ email, firstName, resetUrl }) {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }
    
    const mailOptions = {
      from: this.senderEmail,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Hello ${firstName},</h2>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 15px 32px; text-decoration: none; font-size: 16px; border-radius: 4px;">
            Reset Password
          </a>
        </div>
        <p>If you didn't request this change, you can ignore this email and your password will remain the same.</p>
        <p>This link will expire in 10 minutes for security reasons.</p>
        <p>Best regards,<br>Your Application Team</p>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }
  
  // Send password reset confirmation
  async sendPasswordResetConfirmation({ email, firstName }) {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }
    
    const mailOptions = {
      from: this.senderEmail,
      to: email,
      subject: 'Password Reset Successful',
      html: `
        <h2>Hello ${firstName},</h2>
        <p>Your password has been successfully reset.</p>
        <p>If you did not perform this action, please contact our support team immediately.</p>
        <p>Best regards,<br>Your Application Team</p>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset confirmation email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending password reset confirmation:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();