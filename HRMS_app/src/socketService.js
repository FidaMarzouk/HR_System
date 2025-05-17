import { io } from 'socket.io-client';

// Create a singleton socket instance
let socket = null;

export const getSocket = () => {
  if (!socket) {
    // Initialize if not already done
    socket = io('http://localhost:8080', {
      withCredentials: true,
      auth: {} // Empty auth object to ensure headers are sent
    });

    // Set up global event handlers
    socket.on('connect', () => {
      console.log('Socket connected successfully');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};