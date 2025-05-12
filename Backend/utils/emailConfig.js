const nodemailer = require('nodemailer');

// Create a transporter object using GMAIL
const createTransporter = async (adminEmail, adminPassword) => {
  console.log(`Setting up transporter for: ${adminEmail}`);
  
  // Create reusable transporter object using SMTP transport
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: adminEmail,    // Admin's email address
      pass: adminPassword  // Admin's email password or app password
    },
    tls: {
      // Do not fail on invalid certificates
      rejectUnauthorized: false
    },
    debug: true // Enable debug output
  });
  
  // Verify connection configuration
  try {
    await transporter.verify();
    console.log('SMTP connection verified successfully');
  } catch (error) {
    console.error('SMTP verification failed:', error);
    throw error;
  }
  
  return transporter;
};

module.exports = { createTransporter };