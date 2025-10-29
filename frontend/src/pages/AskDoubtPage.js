import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/api';
import { initSocket, sendMessage, onNewMessage, onNewNotification, disconnectSocket, removeListeners } from '../api/socket';
import { playNotificationSound } from '../utils/notificationSound';
import AskDoubtPageDesktop from './AskDoubtPageDesktop';
import AskDoubtPageMobile from './AskDoubtPageMobile';

const AskDoubtPage = () => {
    const [isMobile, setIsMobile] = useState(false);

    // Lift all shared state up to this parent component
    const [currentUser, setCurrentUser] = useState(null);
    const [adminId, setAdminId] = useState(null);
    const [fighters, setFighters] = useState([]);
    const [messages, setMessages] = useState([]);
    const [activeChat, setActiveChat] = useState({ type: 'common', peer: { _id: null, name: 'Common Group' } });
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [unreadCounts, setUnreadCounts] = useState({});
    const [lastSeenMessages, setLastSeenMessages] = useState({});
    const [readMessages, setReadMessages] = useState(new Set());
    const [replyingTo, setReplyingTo] = useState(null);
    // Notification states
    const [notification, setNotification] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    
    // Refs to prevent duplicate requests
    const isInitializing = useRef(false);
    const messageFetchTimer = useRef(null);
    const messageFetchInterval = useRef(null);
    const notificationDebounceRef = useRef(null);

    // This effect detects the screen size
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => {
            window.removeEventListener('resize', checkIsMobile);
        };
    }, []);

    // Load notification preference from localStorage
    useEffect(() => {
        const savedPreference = localStorage.getItem('notificationsEnabled');
        if (savedPreference !== null) {
            try {
                setNotificationsEnabled(JSON.parse(savedPreference));
            } catch (e) {
                console.error('Failed to parse notification preference from localStorage', e);
                setNotificationsEnabled(true);
            }
        }
    }, []);

    // Save notification preference to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled));
        } catch (e) {
            console.error('Failed to save notification preference to localStorage', e);
        }
    }, [notificationsEnabled]);

    // Initialize data
    useEffect(() => {
        const initializeData = async () => {
            // Prevent duplicate initialization
            if (isInitializing.current) return;
            isInitializing.current = true;
            
            try {
                setLoading(true);
                
                const { data: user } = await api.get('/auth/user');
                setCurrentUser(user);

                // Initialize WebSocket connection
                const socket = initSocket(user);
                
                // Listen for new messages via WebSocket
                onNewMessage((messageData) => {
                    console.log('[SOCKET] Received new message:', messageData);
                    // Add new message to state only if it doesn't already exist
                    setMessages(prev => {
                        // Check if message already exists (including temporary messages with same ID)
                        const exists = prev.some(msg => 
                            msg._id === messageData._id || 
                            (msg.isTemporary && msg.text === messageData.text && 
                             msg.user?._id === messageData.user?._id)
                        );
                        
                        if (!exists) {
                            // Filter out any temporary messages that match this one
                            const filtered = prev.filter(msg => !msg.isTemporary || msg._id !== 'temp_' + Date.now());
                            return [...filtered, messageData];
                        }
                        
                        // If it exists, update the temporary message with actual data
                        return prev.map(msg => {
                            if (msg.isTemporary && msg.text === messageData.text && 
                                msg.user?._id === messageData.user?._id) {
                                return {...messageData, isTemporary: false};
                            }
                            return msg;
                        });
                    });
                });
                
                // Listen for notifications via WebSocket
                onNewNotification((notificationData) => {
                    console.log('[SOCKET] Received notification:', notificationData);
                    // Previously showed notification popup, now just log it
                    console.log('[SOCKET] New message notification received but notifications are disabled');
                });

                if (user?.role === 'admin') {
                    const { data: fighterList } = await api.get('/fighters/roster');
                    setFighters(fighterList || []);
                } else {
                    const { data: { adminId } } = await api.get('/auth/admin-id');
                    console.log('[CLIENT] *** CRITICAL: Fighter received admin ID:', adminId);
                    console.log('[CLIENT] *** This MUST be:', '68bc3872c7f20dc76f9da534', 'for chat to work');
                    console.log('[CLIENT] *** IDs match:', adminId === '68bc3872c7f20dc76f9da534');
                    setAdminId(adminId);
                }

                // Fetch initial messages
                const { data: initialMessages } = await api.get('/doubts');
                setMessages(initialMessages);
                setLoading(false);
            } catch (err) {
                console.error('Failed to initialize data:', err);
                setError('Failed to load data');
                setLoading(false);
            }
        };

        initializeData();

        return () => {
            disconnectSocket();
            removeListeners();
        };
    }, []);

    // Show notification popup for new messages (WhatsApp style)
    const showNotification = useCallback((message, senderName) => {
        console.log('[NOTIFICATION] Showing for:', senderName, message.text?.substring(0, 30));
        
        // Play notification sound if enabled
        if (notificationsEnabled) {
            playNotificationSound();
        }
        
        const newNotification = {
            id: message._id, // Use message ID to prevent duplicates
            senderId: message.user?._id, // Store sender ID for navigation
            senderName,
            text: message.text,
            timestamp: new Date(message.timestamp),
            messageType: message.messageType
        };
        
        setNotification(newNotification);
        
        // Add to notification history only if it's not already there
        setNotifications(prev => {
            // Check if notification already exists
            const exists = prev.some(notif => notif.id === newNotification.id);
            if (!exists) {
                return [newNotification, ...prev.slice(0, 9)]; // Keep only last 10 notifications
            }
            return prev;
        });
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            setNotification(null);
        }, 4000);
    }, [notificationsEnabled, setNotification, setNotifications]);

    // Monitor for new messages and show notifications
    useEffect(() => {
        if (!currentUser || !messages.length) return;
        
        // Debounce notifications to prevent repeated triggers
        if (notificationDebounceRef.current) {
            clearTimeout(notificationDebounceRef.current);
        }
        
        notificationDebounceRef.current = setTimeout(() => {
            // Get the latest message that the user hasn't seen
            const lastMessage = messages[messages.length - 1];
            const isFromCurrentUser = lastMessage?.user?._id?.toString() === currentUser._id.toString();
            
            // Only show notification for messages from others
            if (!isFromCurrentUser && lastMessage) {
                const senderName = lastMessage.user?.name || 'Unknown User';
                
                // Check if we're currently viewing the chat where this message was sent
                let isActiveChat = false;
                if (activeChat?.type === 'private' && lastMessage.recipientId) {
                    // For private chats, check if we're chatting with the sender
                    isActiveChat = activeChat?.peer?._id?.toString() === lastMessage.user?._id?.toString();
                } else if (activeChat?.type === 'common' && !lastMessage.recipientId) {
                    // For common chat, check if we're viewing the common chat
                    isActiveChat = true;
                }
                
                // Check if this message has already been read or notified
                const isMessageRead = lastMessage.isRead || readMessages.has(lastMessage._id);
                
                //console.log('[NOTIFICATION] Checking notification conditions:', {
                //    isFromCurrentUser,
                //    isActiveChat,
                //    isMessageRead,
                //    messageId: lastMessage._id,
                //    senderName,
                //    text: lastMessage.text?.substring(0, 30)
                //});
                
                // Show notification only if:
                // 1. Message is not from current user
                // 2. User is not currently viewing the chat where the message was sent
                // 3. Message has not been read/notified before
                if (!isActiveChat && !isMessageRead) {
                    // Prevent duplicate notifications by checking if we've already shown this message
                    const notificationExists = notifications.some(notif => notif.id === lastMessage._id);
                    
                    if (!notificationExists) {
                        //console.log('[NOTIFICATION] Showing new notification for message:', lastMessage._id);
                        showNotification(lastMessage, senderName);
                        // Mark message as notified but not yet read
                        // We'll use the child components to handle read status to avoid infinite loops
                    }
                }
            }
        }, 300); // Debounce for 300ms
        
        return () => {
            if (notificationDebounceRef.current) {
                clearTimeout(notificationDebounceRef.current);
            }
        };
    }, [messages, currentUser, activeChat, notifications, readMessages, showNotification]);

    // Calculate unread counts for each chat using backend data
    const calculateUnreadCounts = useCallback(() => {
        if (!currentUser || !messages.length) return {};
        
        const counts = {};
        const currentUserId = currentUser._id;
        
        if (currentUser.role === 'admin') {
            // For admin, calculate unread for each fighter
            fighters.forEach(fighter => {
                // Count messages from fighter that admin hasn't read
                const unreadCount = messages.filter(msg => {
                    return msg.user?._id?.toString() === fighter._id.toString() && 
                           msg.recipientId?.toString() === currentUserId.toString() &&
                           !msg.isRead && // Use backend read status
                           !readMessages.has(msg._id); // Also check local state as fallback
                }).length;
                
                if (unreadCount > 0) {
                    counts[fighter._id] = unreadCount;
                }
            });
            
            // Also count common chat messages for admin
            const commonUnreadCount = messages.filter(msg => {
                return !msg.recipientId && // Common chat messages have no recipientId
                       msg.user?._id?.toString() !== currentUserId.toString() && // Not from self
                       !msg.isRead && // Use backend read status
                       !readMessages.has(msg._id); // Also check local state as fallback
            }).length;
            
            if (commonUnreadCount > 0) {
                counts.common = commonUnreadCount;
            }
        } else {
            // For fighter, calculate unread from admin
            if (adminId) {
                // Count messages from admin that fighter hasn't read
                const unreadCount = messages.filter(msg => {
                    return msg.user?._id?.toString() === adminId.toString() && 
                           msg.recipientId?.toString() === currentUserId.toString() &&
                           !msg.isRead && // Use backend read status
                           !readMessages.has(msg._id); // Also check local state as fallback
                }).length;
                
                if (unreadCount > 0) {
                    counts[adminId] = unreadCount;
                }
                
                // Also count common chat messages
                const commonUnreadCount = messages.filter(msg => {
                    return !msg.recipientId && // Common chat messages have no recipientId
                           msg.user?._id?.toString() !== currentUserId.toString() && // Not from self
                           !msg.isRead && // Use backend read status
                           !readMessages.has(msg._id); // Also check local state as fallback
                }).length;
                
                if (commonUnreadCount > 0) {
                    counts.common = commonUnreadCount;
                }
            }
        }
        
        return counts;
    }, [currentUser, messages, fighters, adminId, readMessages]);

    // Filter messages callback - MOVED UP to avoid initialization issues
    const getFilteredMessages = useCallback(() => {
        if (!currentUser || !messages.length) {
            return [];
        }

        const currentUserId = currentUser._id;

        if (activeChat?.type === 'common') {
            const commonMessages = messages
                .filter(msg => !msg.recipient && !msg.recipientId && msg.isVisible)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            return commonMessages;
        }

        if (activeChat?.type === 'private') {
            const peerId = activeChat?.peer?._id;
            if (!peerId) {
                return [];
            }

            const filteredMessages = messages
                .filter(msg => {
                    if (!msg.isVisible) return false;
                    if (!msg.recipient && !msg.recipientId) return false;

                    const senderIdStr = msg.user?._id?.toString();
                    const recipientIdStr = msg.recipient?._id?.toString() || msg.recipientId?.toString();
                    const currentUserIdStr = currentUser._id.toString();
                    const peerIdStr = peerId.toString();

                    const isFromCurrentUserToPeer = (senderIdStr === currentUserIdStr && recipientIdStr === peerIdStr);
                    const isFromPeerToCurrentUser = (senderIdStr === peerIdStr && recipientIdStr === currentUserIdStr);
                    
                    const shouldInclude = isFromCurrentUserToPeer || isFromPeerToCurrentUser;
                    
                    return shouldInclude;
                })
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
            return filteredMessages;
        }

        return [];
    }, [messages, activeChat, currentUser]);

    const getNextMessageType = useCallback(() => {
        if (activeChat?.type === 'common') {
            return 'doubt'; // Common group chat messages should be 'doubt' type
        }
        
        // For private chats, determine based on user role
        if (currentUser?.role === 'admin') {
            return 'clarity'; // Admin sends clarities
        } else {
            return 'doubt'; // Fighter sends doubts
        }
    }, [activeChat, currentUser]);

    // Send message
    const handleSendMessage = useCallback(async (messageData) => {
        if (!currentUser || !messageData.text.trim()) return;

        // Create a temporary message object for immediate UI update
        const tempMessage = {
            _id: 'temp_' + Date.now(),
            text: messageData.text,
            messageType: messageData.messageType || 'doubt',
            user: {
                _id: currentUser._id,
                name: currentUser.name,
            },
            userModel: currentUser.role === 'admin' ? 'Admin' : 'Fighter',
            timestamp: new Date(),
            isTemporary: true // Flag to identify temporary messages
        };

        // Immediately add to UI for instant feedback
        setMessages(prev => [...prev, tempMessage]);

        try {
            const payload = {
                text: messageData.text,
                messageType: messageData.messageType || 'doubt'
            };

            // Add parentDoubt for replies
            if (messageData.parentDoubt) {
                payload.parentDoubt = messageData.parentDoubt;
            }

            // Add recipient for private chats
            if (activeChat?.type === 'private' && activeChat?.peer?._id) {
                payload.recipientId = activeChat.peer._id;
                
                // Log the proper message flow
                if (currentUser.role === 'admin') {
                    console.log('[CLIENT] Admin sending CLARITY (answer) to fighter:', activeChat.peer.name);
                } else {
                    console.log('[CLIENT] Fighter sending DOUBT (question) to admin');
                }
            } else {
                console.log('[CLIENT] Sending common message');
            }

            console.log('[CLIENT] Message payload:', payload);
            const { data: savedMessage } = await api.post('/doubts', payload);
            console.log('[CLIENT] Message saved:', savedMessage);
            
            // Replace the temporary message with the actual saved message
            setMessages(prev => {
                return prev.map(msg => 
                    msg._id === tempMessage._id ? {...savedMessage, isTemporary: false} : msg
                );
            });
            
            // Don't send message via WebSocket here - the server will emit it to all clients
            // after it's saved to the database
            
        } catch (err) {
            console.error('Failed to send message:', err);
            setError('Failed to send message');
            // Remove the temporary message on error
            setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
        }
    }, [currentUser, activeChat]);

    // Delete message
    const handleDeleteMessage = useCallback(async (messageId) => {
        if (!messageId || !window.confirm('Are you sure you want to delete this message?')) return;

        try {
            await api.delete(`/doubts/${messageId}`);
            setMessages(prev => prev.filter(msg => msg._id !== messageId));
        } catch (err) {
            console.error('Failed to delete message:', err);
            setError('Failed to delete message');
        }
    }, []);

    // Update unread counts when messages change
    useEffect(() => {
        // Debounce the unread count calculation to prevent repeated updates
        if (messageFetchInterval.current) {
            clearTimeout(messageFetchInterval.current);
        }
        
        messageFetchInterval.current = setTimeout(() => {
            const counts = calculateUnreadCounts();
            setUnreadCounts(counts);
            
            // Also update the document title to show unread count
            const totalUnread = Object.values(counts).reduce((sum, count) => sum + count, 0);
            if (totalUnread > 0) {
                document.title = `(${totalUnread}) Chat App`;
            } else {
                document.title = 'Chat App';
            }
        }, 300); // Debounce for 300ms
        
        return () => {
            if (messageFetchInterval.current) {
                clearTimeout(messageFetchInterval.current);
            }
        };
    }, [messages, currentUser, fighters, adminId, lastSeenMessages, readMessages, calculateUnreadCounts]);

    // Pass all shared state and functions as props to both components
    const sharedProps = {
        currentUser,
        setCurrentUser,
        adminId,
        setAdminId,
        fighters,
        setFighters,
        messages,
        setMessages,
        activeChat,
        setActiveChat,
        newMessage,
        setNewMessage,
        loading,
        setLoading,
        error,
        setError,
        unreadCounts,
        setUnreadCounts,
        lastSeenMessages,
        setLastSeenMessages,
        readMessages,
        setReadMessages,
        replyingTo,
        setReplyingTo,
        handleSendMessage,
        handleDeleteMessage,
        getFilteredMessages,
        getNextMessageType,
        // Notification props
        notification,
        setNotification,
        notifications,
        setNotifications,
        notificationsEnabled,
        setNotificationsEnabled
    };

    if (isMobile) {
        return <AskDoubtPageMobile {...sharedProps} />;
    }

    return <AskDoubtPageDesktop {...sharedProps} />;
};

export default AskDoubtPage;