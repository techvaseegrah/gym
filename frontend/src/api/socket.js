import io from 'socket.io-client';
import api from './api';

let socket = null;
let currentUser = null;

// Initialize WebSocket connection
export const initSocket = (user) => {
  if (socket) {
    socket.disconnect();
  }

  currentUser = user;
  
  // Connect to WebSocket server
  socket = io('http://localhost:5000');

  // Register user with server
  socket.emit('register_user', {
    userId: user._id,
    role: user.role,
    name: user.name || (user.role === 'admin' ? 'Admin' : 'Fighter')
  });

  console.log('[SOCKET] Initialized socket connection for user:', user._id);
  
  return socket;
};

// Get current socket instance
export const getSocket = () => socket;

// Send a message through WebSocket
export const sendMessage = (messageData) => {
  if (socket) {
    socket.emit('send_message', messageData);
    console.log('[SOCKET] Sent message:', messageData);
  }
};

// Listen for new messages
export const onNewMessage = (callback) => {
  if (socket) {
    // Remove existing listener to prevent duplicates
    socket.off('new_message', callback);
    socket.on('new_message', callback);
  }
};

// Listen for notifications
export const onNewNotification = (callback) => {
  if (socket) {
    // Remove existing listener to prevent duplicates
    socket.off('new_notification', callback);
    socket.on('new_notification', callback);
  }
};

// Listen for user updates
export const onUsersUpdated = (callback) => {
  if (socket) {
    // Remove existing listener to prevent duplicates
    socket.off('users_updated', callback);
    socket.on('users_updated', callback);
  }
};

// Remove event listeners
export const removeListeners = () => {
  if (socket) {
    socket.removeAllListeners('new_message');
    socket.removeAllListeners('new_notification');
    socket.removeAllListeners('users_updated');
  }
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentUser = null;
    console.log('[SOCKET] Disconnected socket');
  }
};