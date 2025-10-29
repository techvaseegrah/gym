const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/authMiddleware');
const Doubt = require('../models/Doubt');
const Admin = require('../models/Admin');
const Fighter = require('../models/Fighter');

// @route   GET /api/doubts
// @desc    Get all relevant doubts for the user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log(`[DOUBTS] User ${req.user.id} (${req.user.role}) requesting messages`);

    // Convert string ID to ObjectId for proper comparison
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Build query - both admin and fighter get filtered results
    const query = {
      isVisible: true,
      $or: [
        { recipient: null },       // Common messages (no recipient)
        { user: userId },          // Messages sent by user
        { recipient: userId },     // Messages sent to user
        { recipientId: userId }    // FIXED: Also check recipientId field
      ]
    };

    console.log('[DOUBTS] Query:', JSON.stringify(query, null, 2));

    // Fetch messages and sort by timestamp
    const doubts = await Doubt.find(query).sort({ timestamp: 1 });
    console.log(`[DOUBTS] Found ${doubts.length} raw messages`);

    // Populate user and recipient data
    const populatedDoubts = await Promise.all(
      doubts.map(async (doubt) => {
        const doubtObj = doubt.toObject();

        // Populate sender
        if (doubtObj.user && doubtObj.userModel) {
          doubtObj.user = await populateUser(doubtObj.user, doubtObj.userModel);
        }

        // Populate recipient - FIXED: Handle both recipient and recipientId
        if (doubtObj.recipient && doubtObj.recipientModel) {
          doubtObj.recipient = await populateUser(doubtObj.recipient, doubtObj.recipientModel);
        } else if (doubtObj.recipientId) {
          // Handle case where we have recipientId but no populated recipient
          const recipientData = await validateRecipient(doubtObj.recipientId);
          if (recipientData) {
            doubtObj.recipient = recipientData.recipient;
            doubtObj.recipientModel = recipientData.model;
          }
        }

        // Add read status for the current user
        doubtObj.isRead = doubtObj.readBy && doubtObj.readBy.some(id => 
          id.toString() === req.user.id.toString()
        );

        return doubtObj;
      })
    );

    // Filter out messages with failed population
    const validDoubts = populatedDoubts.filter(doubt => doubt.user);

    // Debug: Log sample of messages for troubleshooting
    console.log(`[DOUBTS] Sample messages for user ${req.user.id}:`);
    validDoubts.slice(0, 5).forEach((msg, index) => {
      console.log(`  ${index + 1}. Type: ${msg.messageType}, From: ${msg.user?.name}, To: ${msg.recipient?.name || 'Common'}, Text: ${msg.text?.substring(0, 30)}..., Read: ${msg.isRead}`);
    });

    console.log(`[DOUBTS] Returning ${validDoubts.length} populated messages`);
    res.json(validDoubts);

  } catch (error) {
    console.error('[DOUBTS] Error fetching messages:', error);
    res.status(500).json({ 
      msg: 'Server Error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/doubts
// @desc    Create a new doubt/message
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { text, recipientId, messageType = 'doubt', parentDoubt } = req.body;

    console.log(`[DOUBTS] Creating message - User: ${req.user.id} (${req.user.role})`);
    console.log('[DOUBTS] Request data:', { 
      text: text?.substring(0, 50) + '...', 
      recipientId, 
      messageType, 
      parentDoubt 
    });

    // Validate input
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ msg: 'Message text is required' });
    }

    if (text.trim().length > 2000) {
      return res.status(400).json({ msg: 'Message text too long (max 2000 characters)' });
    }

    // FIXED: Enforce proper message type logic for private chats
    let validatedMessageType = messageType;
    if (recipientId) {
      // Private chat - enforce role-based message types
      if (req.user.role === 'admin') {
        validatedMessageType = 'clarity'; // Admin can only send clarities (answers)
        console.log('[DOUBTS] Admin sending clarity (answer)');
      } else {
        validatedMessageType = 'doubt'; // Fighter can only send doubts (questions)
        console.log('[DOUBTS] Fighter sending doubt (question)');
      }
    } else {
      // Common chat - use the provided message type, default to doubt if not provided
      validatedMessageType = messageType || 'doubt';
      console.log(`[DOUBTS] Common chat message with type: ${validatedMessageType}`);
    }

    // Create base message object
    const messageData = {
      text: text.trim(),
      user: new mongoose.Types.ObjectId(req.user.id),
      userModel: req.user.role === 'admin' ? 'Admin' : 'Fighter',
      messageType: validatedMessageType, // FIXED: Use validated message type
      isVisible: true,
      parentDoubt: parentDoubt ? new mongoose.Types.ObjectId(parentDoubt) : null
    };

    // Handle recipient for private messages
    if (recipientId) {
      console.log(`[DOUBTS] Looking up recipient: ${recipientId}`);
      
      const recipientData = await validateRecipient(recipientId);
      if (!recipientData) {
        console.log(`[DOUBTS] Invalid recipient ID: ${recipientId}`);
        return res.status(400).json({ msg: 'Invalid recipient ID' });
      }

      messageData.recipient = new mongoose.Types.ObjectId(recipientId);
      messageData.recipientModel = recipientData.model;
      // FIXED: Also store recipientId for easier querying
      messageData.recipientId = new mongoose.Types.ObjectId(recipientId);
      
      console.log(`[DOUBTS] Found recipient: ${recipientData.recipient.name} (${recipientData.model})`);
    } else {
      console.log('[DOUBTS] Creating common message (no recipient)');
    }

    // Save message
    const doubt = new Doubt(messageData);
    const savedDoubt = await doubt.save();
    
    console.log(`[DOUBTS] Message saved with ID: ${savedDoubt._id}`);

    // Handle parent-child relationship
    if (parentDoubt) {
      try {
        await Doubt.findByIdAndUpdate(parentDoubt, {
          $push: { replies: savedDoubt._id },
          $set: { lastReplyAt: new Date() }
        });
        console.log(`[DOUBTS] Updated parent message: ${parentDoubt}`);
      } catch (error) {
        console.error('[DOUBTS] Error updating parent message:', error);
      }
    }

    // Populate and return the saved message
    const populatedMessage = savedDoubt.toObject();
    
    // Populate sender
    if (populatedMessage.user && populatedMessage.userModel) {
      populatedMessage.user = await populateUser(populatedMessage.user, populatedMessage.userModel);
    }

    // Populate recipient
    if (populatedMessage.recipient && populatedMessage.recipientModel) {
      populatedMessage.recipient = await populateUser(populatedMessage.recipient, populatedMessage.recipientModel);
    }

    console.log('[DOUBTS] Message created successfully');
    console.log('[DOUBTS] Final message data:', {
      _id: populatedMessage._id,
      text: populatedMessage.text.substring(0, 50) + '...',
      user: populatedMessage.user?.name,
      userModel: populatedMessage.userModel,
      recipient: populatedMessage.recipient?.name || 'No recipient',
      recipientId: populatedMessage.recipientId,
      recipientModel: populatedMessage.recipientModel,
      messageType: populatedMessage.messageType,
      timestamp: populatedMessage.timestamp
    });
    
    // Emit the new message via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('new_message', populatedMessage);
      console.log('[WEBSOCKET] Emitted new message to all clients');
      
      // Send notification to recipient if it's a private message
      if (recipientId) {
        console.log(`[WEBSOCKET] Sending notification for private message to: ${recipientId}`);
        io.emit('new_notification', {
          type: 'private_message',
          sender: populatedMessage.user,
          message: populatedMessage.text,
          messageType: populatedMessage.messageType,
          recipientId: recipientId
        });
      }
    }
    
    res.status(201).json(populatedMessage);

  } catch (error) {
    console.error('[DOUBTS] Error creating message:', error);
    res.status(500).json({ 
      msg: 'Server Error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/doubts/:id/toggle
// @desc    Toggle message visibility
// @access  Private
router.put('/:id/toggle', auth, async (req, res) => {
  try {
    const messageId = req.params.id;
    console.log(`[DOUBTS] Toggling visibility for message: ${messageId} by user: ${req.user.id}`);

    const doubt = await Doubt.findById(messageId);
    if (!doubt) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    // Check permissions
    const isOwner = doubt.user.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ msg: 'Not authorized to modify this message' });
    }

    // Toggle visibility
    doubt.isVisible = !doubt.isVisible;
    await doubt.save();

    console.log(`[DOUBTS] Message visibility toggled to: ${doubt.isVisible}`);
    res.json({ 
      msg: 'Visibility updated successfully', 
      isVisible: doubt.isVisible 
    });

  } catch (error) {
    console.error('[DOUBTS] Error toggling visibility:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   PUT /api/doubts/:id/resolve
// @desc    Mark a doubt as resolved (Admin only)
// @access  Private
router.put('/:id/resolve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }

    const messageId = req.params.id;
    console.log(`[DOUBTS] Resolving message: ${messageId} by admin: ${req.user.id}`);

    const doubt = await Doubt.findById(messageId);
    if (!doubt) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    doubt.isResolved = true;
    await doubt.save();

    console.log('[DOUBTS] Message marked as resolved');
    res.json({ msg: 'Message marked as resolved successfully' });

  } catch (error) {
    console.error('[DOUBTS] Error resolving message:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   DELETE /api/doubts/:id
// @desc    Delete a message (Admin only)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }

    const messageId = req.params.id;
    console.log(`[DOUBTS] Deleting message: ${messageId} by admin: ${req.user.id}`);

    const doubt = await Doubt.findById(messageId);
    if (!doubt) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    // Delete the message
    await Doubt.findByIdAndDelete(messageId);

    // Remove from parent's replies if it's a reply
    if (doubt.parentDoubt) {
      try {
        await Doubt.findByIdAndUpdate(doubt.parentDoubt, {
          $pull: { replies: messageId }
        });
        console.log(`[DOUBTS] Removed from parent message replies`);
      } catch (error) {
        console.error('[DOUBTS] Error updating parent message:', error);
      }
    }

    // Delete all replies if it's a parent message
    if (doubt.replies && doubt.replies.length > 0) {
      try {
        await Doubt.deleteMany({ _id: { $in: doubt.replies } });
        console.log(`[DOUBTS] Deleted ${doubt.replies.length} reply messages`);
      } catch (error) {
        console.error('[DOUBTS] Error deleting reply messages:', error);
      }
    }

    console.log('[DOUBTS] Message deleted successfully');
    res.json({ msg: 'Message deleted successfully' });

  } catch (error) {
    console.error('[DOUBTS] Error deleting message:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET /api/doubts/stats
// @desc    Get message statistics (Admin only)
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }

    const stats = await Promise.all([
      Doubt.countDocuments({ isVisible: true }),
      Doubt.countDocuments({ isVisible: true, recipient: null }),
      Doubt.countDocuments({ isVisible: true, recipient: { $ne: null } }),
      Doubt.countDocuments({ isVisible: true, messageType: 'doubt' }),
      Doubt.countDocuments({ isVisible: true, messageType: 'clarity' }),
      Doubt.countDocuments({ isResolved: true })
    ]);

    res.json({
      total: stats[0],
      common: stats[1],
      private: stats[2],
      doubts: stats[3],
      clarities: stats[4],
      resolved: stats[5]
    });

  } catch (error) {
    console.error('[DOUBTS] Error fetching stats:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   POST /api/doubts/:id/read
// @desc    Mark a message as read by the current user
// @access  Private
router.post('/:id/read', auth, async (req, res) => {
  try {
    const messageId = req.params.id;
    console.log(`[DOUBTS] Marking message ${messageId} as read by user ${req.user.id} (${req.user.role})`);

    const doubt = await Doubt.findById(messageId);
    if (!doubt) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    // Add user to readBy array if not already there
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const userAlreadyRead = doubt.readBy.some(id => id.equals(userId));
    
    if (!userAlreadyRead) {
      doubt.readBy.push(userId);
      doubt.readByModel = req.user.role;
      await doubt.save();
      console.log(`[DOUBTS] Message marked as read by user ${req.user.id}`);
    } else {
      console.log(`[DOUBTS] Message already marked as read by user ${req.user.id}`);
    }

    res.json({ msg: 'Message marked as read' });
  } catch (error) {
    console.error('[DOUBTS] Error marking message as read:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   POST /api/doubts/mark-chat-read
// @desc    Mark all messages in a chat as read by the current user
// @access  Private
router.post('/mark-chat-read', auth, async (req, res) => {
  try {
    const { chatUserId } = req.body; // ID of the other user in the chat
    console.log(`[DOUBTS] Marking all messages with user ${chatUserId} as read by user ${req.user.id} (${req.user.role})`);

    // Validate chatUserId
    if (!chatUserId) {
      return res.status(400).json({ msg: 'chatUserId is required' });
    }

    // Build query to find messages between these two users
    const query = {
      $and: [
        { isVisible: true },
        {
          $or: [
            { user: req.user.id, recipientId: chatUserId },
            { user: chatUserId, recipientId: req.user.id }
          ]
        }
      ]
    };

    // Update all matching messages to mark them as read
    const result = await Doubt.updateMany(query, {
      $addToSet: { 
        readBy: new mongoose.Types.ObjectId(req.user.id) 
      },
      readByModel: req.user.role
    });

    console.log(`[DOUBTS] Marked ${result.modifiedCount} messages as read`);
    res.json({ 
      msg: `Marked ${result.modifiedCount} messages as read`,
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('[DOUBTS] Error marking chat as read:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET /api/doubts/unread-counts
// @desc    Get unread message counts for all chats
// @access  Private
router.get('/unread-counts', auth, async (req, res) => {
  try {
    console.log(`[DOUBTS] Fetching unread counts for user ${req.user.id} (${req.user.role})`);

    // Convert string ID to ObjectId for proper comparison
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Build query to find all messages where the user is the recipient and hasn't read them
    const query = {
      recipientId: userId,
      isVisible: true,
      $or: [
        { readBy: { $exists: false } },
        { readBy: { $not: { $elemMatch: { $eq: userId } } } }
      ]
    };

    // Find all unread messages and group by sender
    const unreadMessages = await Doubt.find(query).select('user recipientId');
    
    // Count unread messages by sender
    const unreadCounts = {};
    unreadMessages.forEach(msg => {
      const senderId = msg.user.toString();
      unreadCounts[senderId] = (unreadCounts[senderId] || 0) + 1;
    });

    console.log(`[DOUBTS] Unread counts:`, unreadCounts);
    res.json(unreadCounts);
  } catch (error) {
    console.error('[DOUBTS] Error fetching unread counts:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Utility functions
const populateUser = async (userId, userModel) => {
  try {
    if (userModel === 'Admin') {
      const admin = await Admin.findById(userId).select('_id name');
      // Always return the name as "Admin" for privacy/consistency
      return admin ? { ...admin.toObject(), name: 'Admin' } : null;
    } else if (userModel === 'Fighter') {
      const fighter = await Fighter.findById(userId).select('_id name');
      return fighter ? fighter.toObject() : null;
    }
    return null;
  } catch (error) {
    console.error(`Error populating ${userModel}:`, error);
    return null;
  }
};

const validateRecipient = async (recipientId) => {
  try {
    // Check if it's a fighter
    let recipient = await Fighter.findById(recipientId);
    if (recipient) {
      return { recipient, model: 'Fighter' };
    }
    
    // Check if it's an admin
    recipient = await Admin.findById(recipientId);
    if (recipient) {
      return { recipient, model: 'Admin' };
    }
    
    return null;
  } catch (error) {
    console.error('Error validating recipient:', error);
    return null;
  }
};

module.exports = router;