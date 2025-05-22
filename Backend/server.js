process.env.TZ = 'Africa/Tunis';
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser'); 
const cron = require('node-cron');
const http = require('http');
const { updateAllUsersLeaveBalance } = require('./Middlewares/leaveCalculationHelper'); 
const authRoutes = require('./Routes/authRoutes');
const userRoutes = require('./Routes/userRoutes');
const leaveRequestRoutes = require('./Routes/leaveRequestRoutes');
const notificationRoutes = require('./Routes/notificationRoutes');
const departmentRoutes = require('./Routes/departmentRoutes');
const attendanceRoutes = require('./Routes/attendanceRoutes');
const calendarRoutes = require('./Routes/calendarRoutes');
const { initializeSocket } = require('./Middlewares/notificationService');
const chatbotRoutes = require('./Routes/chatbot.routes');
const chatRoutes = require('./Routes/ChatRoutes'); 
const hrDashRoutes = require('./Routes/hrDashboardRoutes')
const employeeDashRoutes = require('./Routes/employeeDashboardRoutes')
const managerDashRoutes = require('./Routes/managerDashboardRoutes')
const { markAbsentUsers } = require('./Controllers/attendanceController');
const app = express();
const server = http.createServer(app);

console.log('Current server time:', new Date().toLocaleString());
// Initialize Socket.IO
const io = initializeSocket(server);
app.set('io', io);

// Update CORS configuration to allow credentials
app.use(cors({
  origin: 'http://localhost:5173',  
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  
  allowedHeaders: ['Content-Type', 'Authorization'], 
  credentials: true // This allows cookies to be sent cross-domain
}));

// Add cookie parser middleware
app.use(cookieParser());

// Middleware to parse JSON requests
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Schedule monthly leave balance update (runs on the 1st of each month at 00:00)
cron.schedule('0 0 1 * *', async () => {
  console.log('Running monthly leave balance update...');
  await updateAllUsersLeaveBalance();
}, {
  scheduled: true,
   timezone: 'Africa/Tunis'
});

// Run at 10:00 PM every weekday (Monday to Friday)
cron.schedule('0 22 * * 1-5', async () => {
  try {
    console.log(`Cron job triggered at ${new Date().toLocaleString()}`);
    const absentCount = await markAbsentUsers();
    console.log(`Marked ${absentCount} users as absent`);
  } catch (error) {
    console.error('Error in absent marking job:', error);
  }
}, {
  scheduled: true,
  timezone: 'Africa/Tunis'
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/hr', hrDashRoutes);
app.use('/api/employee', employeeDashRoutes);
app.use('/api/manager', managerDashRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});