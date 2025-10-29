const Doubt = require('./models/Doubt');

// Store connected users
const connectedUsers = new Map();

// Initialize socket handler
const initSocketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);

    // Register user
    socket.on('register_user', (userData) => {
      console.log(`[SOCKET] User registered:`, userData);
      connectedUsers.set(socket.id, {
        userId: userData.userId,
        role: userData.role,
        name: userData.name,
        socketId: socket.id
      });
      
      // Broadcast updated user list
      io.emit('users_updated', Array.from(connectedUsers.values()));
    });

    // Handle sending messages
    socket.on('send_message', async (messageData) => {
      console.log(`[SOCKET] Message received from ${socket.id}:`, messageData);
      
      // Don't emit the message immediately - let the HTTP endpoint handle the emission
      // after the message is saved to the database
      
      // Send notification to recipient if it's a private message
      if (messageData.recipientId) {
        const sender = connectedUsers.get(socket.id);
        if (sender) {
          console.log(`[SOCKET] Sending notification for private message to: ${messageData.recipientId}`);
          io.emit('new_notification', {
            type: 'private_message',
            sender: {
              _id: sender.userId,
              name: sender.name
            },
            message: messageData.text,
            messageType: messageData.messageType,
            recipientId: messageData.recipientId
          });
        }
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${socket.id}`);
      connectedUsers.delete(socket.id);
      
      // Broadcast updated user list
      io.emit('users_updated', Array.from(connectedUsers.values()));
    });
  });
};

// Get connected users
const getConnectedUsers = () => {
  return Array.from(connectedUsers.values());
};

module.exports = {
  initSocketHandler,
  getConnectedUsers
};