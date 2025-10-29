import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '../api/api';
import { initSocket, sendMessage, onNewMessage, onNewNotification, disconnectSocket } from '../api/socket';
import { playNotificationSound } from '../utils/notificationSound';
import '../styles/AskDoubt.css';
import { 
    FaUserShield, 
    FaUserNinja, 
    FaPaperPlane, 
    FaUsers, 
    FaReply, 
    FaTrash,
    FaSearch,
    FaTimes,
    FaExpand,
    FaCompress,
    FaSpinner,
    FaClock,
    FaDotCircle,
    FaExclamationCircle,
    FaBell,
    FaBars
} from 'react-icons/fa';

// ===== UTILITY COMPONENTS =====

const LoadingSpinner = ({ message = "Loading..." }) => (
    <div className="flex items-center justify-center p-8">
        <FaSpinner className="animate-spin text-2xl text-blue-500 mr-3" />
        <span className="text-gray-600 mobile-text-base">{message}</span>
    </div>
);

const EmptyState = ({ icon: Icon, title, description, action }) => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
        <Icon className="text-6xl text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2 mobile-text-lg">{title}</h3>
        <p className="text-gray-500 mb-4 mobile-text-base">{description}</p>
        {action}
    </div>
);

// ===== SIDEBAR COMPONENTS =====

const ChatSidebar = ({ currentUser, fighters, activeChat, setActiveChat, adminId, unreadCounts = {}, isMobile, isSidebarOpen, setIsSidebarOpen, messages }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const isAdmin = currentUser?.role === 'admin';

    // Calculate latest message timestamp for each fighter
    const getSortedFighters = useCallback(() => {
        if (!isAdmin || !fighters || !messages) return fighters || [];
        
        // Create a map of fighter ID to latest message timestamp
        const fighterLatestMessageMap = {};
        
        // Process all messages to find the latest timestamp for each fighter
        messages.forEach(message => {
            let fighterId = null;
            
            // For private messages where recipient is a fighter
            if (message.recipient && message.recipient._id && message.recipientModel === 'Fighter') {
                fighterId = message.recipient._id;
            } 
            // For private messages where sender is a fighter
            else if (message.user && message.user._id && message.userModel === 'Fighter') {
                fighterId = message.user._id;
            }
            
            // Update the latest timestamp for this fighter
            if (fighterId) {
                const timestamp = new Date(message.timestamp).getTime();
                if (!fighterLatestMessageMap[fighterId] || timestamp > fighterLatestMessageMap[fighterId]) {
                    fighterLatestMessageMap[fighterId] = timestamp;
                }
            }
        });
        
        // Sort fighters based on latest message timestamp (newest first)
        return [...fighters].sort((a, b) => {
            const timestampA = fighterLatestMessageMap[a._id] || 0;
            const timestampB = fighterLatestMessageMap[b._id] || 0;
            return timestampB - timestampA; // Descending order (newest first)
        });
    }, [fighters, messages, isAdmin]);

    const sortedFighters = useMemo(() => getSortedFighters(), [getSortedFighters]);
    
    const filteredFighters = useMemo(() => 
        sortedFighters.filter(fighter =>
            fighter?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        ), [sortedFighters, searchTerm]);

    const ChatItem = React.memo(({ chat, isActive, onClick, icon: Icon, title, subtitle, chatId }) => {
        const unreadCount = unreadCounts[chatId] || 0;
        const hasUnread = unreadCount > 0;
        
        // Only log for debugging if needed
        // console.log('[SIDEBAR] ChatItem render:', { chatId, unreadCount, hasUnread, title });
        
        return (
            <div
                onClick={onClick}
                className={`flex items-center p-4 cursor-pointer transition-all duration-200 border-b border-gray-200 hover:bg-gray-100 relative ${
                    isActive ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
                } ${hasUnread && !isActive ? 'bg-blue-50' : ''}`}
            >
                {/* Unread indicator dot */}
                {hasUnread && !isActive && (
                    <div className="absolute left-2 top-2 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>
                )}
                
                <div className="relative mr-4">
                    <Icon className={`text-xl ${isActive ? 'text-blue-600' : hasUnread ? 'text-green-600' : 'text-gray-600'}`} />
                    {hasUnread && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse font-bold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </div>
                
                <div className="flex-grow">
                    <h4 className={`font-medium ${isActive ? 'text-blue-700' : hasUnread ? 'text-gray-800' : 'text-gray-700'} mobile-text-lg`}>
                        {title}
                        {hasUnread && (
                            <span className="ml-2 text-green-600 text-sm">• New</span>
                        )}
                    </h4>
                    <p className={`text-sm ${isActive ? 'text-blue-600' : hasUnread ? 'text-gray-600' : 'text-gray-500'} mobile-text-base`}>
                        {subtitle}
                        {hasUnread && (
                            <span className="ml-2 text-green-600 font-medium">({unreadCount} new)</span>
                        )}
                    </p>
                </div>
                
                {isActive && <FaDotCircle className="text-green-500" />}
            </div>
        );
    }, (prevProps, nextProps) => {
        // Custom comparison function for React.memo
        // Compare unreadCounts by value, not reference
        const prevUnreadCount = prevProps.unreadCounts[prevProps.chatId] || 0;
        const nextUnreadCount = nextProps.unreadCounts[nextProps.chatId] || 0;
        
        return (
            prevProps.isActive === nextProps.isActive &&
            prevProps.title === nextProps.title &&
            prevProps.subtitle === nextProps.subtitle &&
            prevProps.chatId === nextProps.chatId &&
            prevUnreadCount === nextUnreadCount
        );
    });

    // For mobile, we show a toggle button in the chat header instead
    if (isMobile && !isSidebarOpen) {
        return null;
    }

    return (
        <div className={`bg-white text-gray-800 border-r border-gray-200 flex flex-col ${
            isMobile ? 'fixed inset-y-0 left-0 z-50 w-4/5 max-w-sm transform transition-transform duration-300 ease-in-out' : 'w-80'
        } ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}>
            {/* Mobile header with close button */}
            {isMobile && (
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h2 className="text-xl font-bold">
                        {isAdmin ? '💬 Doubt Management' : '🤔 Ask Doubts'}
                    </h2>
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-2 rounded-lg hover:bg-gray-200"
                    >
                        <FaTimes />
                    </button>
                </div>
            )}
            
            {/* Desktop header */}
            {!isMobile && (
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-bold text-center">
                        {isAdmin ? '💬 Doubt Management' : '🤔 Ask Doubts'}
                    </h2>
                    <p className="text-sm text-gray-600 text-center mt-1">
                        {isAdmin ? 'Admin Panel' : 'Get Help & Clarity'}
                    </p>
                </div>
            )}

            {/* Search */}
            {isAdmin && (
                <div className="p-3 border-b border-gray-200">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" />
                        <input
                            type="text"
                            placeholder="Search fighters..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 text-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                <FaTimes className="text-sm" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Chat List */}
            <div className="flex-grow overflow-y-auto">
                {/* Common Group */}
                <ChatItem
                    chat={{ type: 'common' }}
                    isActive={activeChat?.type === 'common'}
                    onClick={() => {
                        setActiveChat({ type: 'common', peer: { _id: null, name: 'Common Group' } });
                        if (isMobile) setIsSidebarOpen(false);
                    }}
                    icon={FaUsers}
                    title="Common Group"
                    subtitle="Group discussion for all members"
                />

                {/* Private Chats */}
                {isAdmin ? (
                    // Admin sees all fighters
                    filteredFighters.map(fighter => (
                        <ChatItem
                            key={fighter._id}
                            chat={{ type: 'private', peer: fighter }}
                            isActive={activeChat?.type === 'private' && activeChat?.peer?._id === fighter._id}
                            onClick={() => {
                                console.log('[CLIENT] Admin selecting chat with fighter:', {
                                    fighterName: fighter.name,
                                    fighterId: fighter._id,
                                    adminId: currentUser._id
                                });
                                setActiveChat({ type: 'private', peer: fighter });
                                if (isMobile) setIsSidebarOpen(false);
                            }}
                            icon={FaUserNinja}
                            title={fighter.name}
                            subtitle="Doubt-Clarity chat"
                            chatId={fighter._id}
                        />
                    ))
                ) : (
                    // Fighter sees only admin
                    <ChatItem
                        chat={{ type: 'private', peer: { _id: adminId, name: 'Admin' } }}
                        isActive={activeChat?.type === 'private' && activeChat?.peer?._id === adminId}
                        onClick={() => {
                            console.log('[CLIENT] Fighter selecting chat with admin:', {
                                adminId: adminId,
                                fighterId: currentUser?._id
                            });
                            setActiveChat({ type: 'private', peer: { _id: adminId, name: 'Admin' } });
                            if (isMobile) setIsSidebarOpen(false);
                        }}
                        icon={FaUserShield}
                        title="Private with Admin"
                        subtitle="Doubt-Clarity format"
                        chatId={adminId}
                    />
                )}

                {/* No results */}
                {isAdmin && filteredFighters.length === 0 && searchTerm && (
                    <div className="p-4 text-center text-gray-500">
                        <p className="mobile-text-base">No fighters found matching "{searchTerm}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ===== MESSAGE COMPONENTS =====

const CommonMessage = ({ message, currentUser, onReply, onDelete, isAdmin, replyingTo }) => {
    const [showActions, setShowActions] = useState(false);
    const isOwnMessage = message?.user?._id === currentUser?._id;
    const isAdminMessage = message?.userModel === 'Admin';
    const isReply = !!message?.parentDoubt;
    
    // Find the replied-to message if this is a reply
    const repliedToMessage = isReply && replyingTo ? replyingTo.find(m => m._id === message.parentDoubt) : null;

    return (
        <div 
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={`flex items-end gap-3 max-w-lg ${isOwnMessage ? 'flex-row-reverse' : ''} relative`}>
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                        isAdminMessage ? 'bg-blue-500' : 'bg-green-500'
                    }`}>
                        {isAdminMessage ? 
                            <FaUserShield className="text-white text-sm" /> : 
                            <FaUserNinja className="text-white text-sm" />
                        }
                    </div>
                </div>

                {/* Message Bubble */}
                <div className={`px-4 py-3 rounded-2xl shadow-sm max-w-full transition-all duration-200 ${
                    isOwnMessage 
                        ? 'bg-blue-500 text-white rounded-br-sm' 
                        : 'bg-gray-100 text-gray-800 border border-gray-200 rounded-bl-sm'
                }`}>
                    {/* Reply context display */}
                    {repliedToMessage && (
                        <div className="mb-2 p-2 bg-blue-100 rounded-lg border-l-2 border-blue-500">
                            <p className="text-xs font-bold text-blue-800 truncate">
                                {repliedToMessage.user?.name || 'Unknown User'}
                            </p>
                            <p className="text-xs text-blue-700 truncate">
                                {repliedToMessage.text.length > 50 ? 
                                    repliedToMessage.text.substring(0, 50) + '...' : 
                                    repliedToMessage.text}
                            </p>
                        </div>
                    )}
                    
                    <p className={`text-xs font-bold mb-2 ${isOwnMessage ? 'text-blue-100' : 'text-blue-600'} mobile-text-sm`}>
                        {isOwnMessage ? 'You' : message?.user?.name || 'Unknown User'}
                    </p>
                    
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mobile-text-base">
                        {message?.text || ''}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                        <p className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'} mobile-text-sm`}>
                            {message?.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : ''}
                        </p>
                    </div>
                </div>

                {/* Action buttons */}
                {showActions && (
                    <div className={`absolute bottom-0 ${isOwnMessage ? 'left-0' : 'right-0'} transform ${
                        isOwnMessage ? '-translate-x-full' : 'translate-x-full'
                    } flex space-x-1 bg-gray-800 rounded-lg p-2 shadow-lg z-20`}>
                        <button
                            onClick={() => onReply?.(message)}
                            className="p-2 text-white hover:bg-gray-700 rounded text-xs transition-colors"
                            title="Reply"
                        >
                            <FaReply />
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => onDelete?.(message?._id)}
                                className="p-2 text-red-400 hover:bg-red-600 hover:text-white rounded text-xs transition-colors"
                                title="Delete"
                            >
                                <FaTrash />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const PrivateMessageTable = ({ messages, currentUser, onDelete }) => {
    const isAdmin = currentUser?.role === 'admin';
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const isScrollAtBottom = useRef(true);
    
    // Track if user is manually scrolling
    const isUserScrolling = useRef(false);
    
    // Check if scroll is at bottom
    const checkIfScrollIsAtBottom = useCallback(() => {
        if (!messagesContainerRef.current) return true;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        return Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
    }, []);
    
    // Handle scroll events to detect manual scrolling
    const handleScroll = useCallback(() => {
        isScrollAtBottom.current = checkIfScrollIsAtBottom();
        
        // If user scrolled up (away from bottom), set flag
        if (!isScrollAtBottom.current) {
            isUserScrolling.current = true;
        } else {
            // If user scrolled back to bottom, reset flag
            isUserScrolling.current = false;
        }
    }, [checkIfScrollIsAtBottom]);
    
    // Auto-scroll to bottom for new messages (desktop view only)
    useEffect(() => {
        const scrollContainer = messagesContainerRef.current;
        if (!scrollContainer) return;
        
        // Add scroll listener
        scrollContainer.addEventListener('scroll', handleScroll);
        
        // Scroll to bottom only if:
        // 1. User is at/near bottom already, OR
        // 2. This is a new message and user isn't manually scrolling
        if (isScrollAtBottom.current || !isUserScrolling.current) {
            // Use requestAnimationFrame to ensure DOM is updated
            requestAnimationFrame(() => {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                }
            });
        }
        
        // Cleanup
        return () => {
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handleScroll);
            }
        };
    }, [messages, handleScroll]);
    
    // FIXED: Separate messages by type with proper logic
    // Doubts should only be from fighters, clarities should only be from admin
    const doubts = messages
        .filter(msg => msg?.messageType === 'doubt' && msg?.userModel === 'Fighter')
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const clarities = messages
        .filter(msg => msg?.messageType === 'clarity' && msg?.userModel === 'Admin')
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const maxRows = Math.max(doubts.length, clarities.length, 5);

    const MessageCell = ({ message, type }) => {
        if (!message) {
            return (
                <div className="p-4 border-b border-gray-200 min-h-[80px] bg-white flex items-center justify-center">
                    <span className="text-gray-300">-</span>
                </div>
            );
        }

        const isAdminMessage = message?.userModel === 'Admin';
        const isFighterMessage = message?.userModel === 'Fighter';
        const isOwnMessage = message?.user?._id === currentUser?._id;
        
        // Determine alignment based on user role and message type
        let justifyContent = 'flex-start'; // Default to left alignment
        
        if (isAdmin) {
            // Admin panel: Admin messages on right, Fighter messages on left
            if (isOwnMessage) {
                justifyContent = 'flex-end'; // Admin's own messages on right
            } else {
                justifyContent = 'flex-start'; // Fighter messages on left
            }
        } else {
            // Fighter panel: Fighter messages on left, Admin messages on right
            if (isOwnMessage) {
                justifyContent = 'flex-start'; // Fighter's own messages on left
            } else {
                justifyContent = 'flex-end'; // Admin messages on right
            }
        }
        
        return (
            <div className="p-4 border-b border-gray-200 min-h-[80px] hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {/* Removed role symbols as per requirements */}
                        <span className="font-medium text-sm text-gray-700 mobile-text-sm">
                            {message?.user?.name || 'Unknown'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <button
                                onClick={() => onDelete?.(message?._id)}
                                className="p-1 text-red-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete"
                            >
                                <FaTrash />
                            </button>
                        )}
                    </div>
                </div>
                <div className={`flex ${justifyContent}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl shadow-sm my-2 ${
                        isOwnMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                    }`}>
                        {message?.text || ''}
                        <span className={`block text-xs mt-1 ${
                            isOwnMessage ? 'text-right text-gray-300' : 'text-left text-gray-500'
                        }`}>
                            {message?.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            }) : ''}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-grow overflow-hidden bg-gray-50 flex flex-col h-full">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-indigo-900 text-white sticky top-0 z-10">
                <div className="col-span-1 p-4 border-r border-indigo-700 text-center font-bold">
                    #
                </div>
                <div className="col-span-5 p-4 border-r border-indigo-700 font-bold flex items-center">
                    <span>Fighter's Doubts (Questions)</span>
                </div>
                <div className="col-span-6 p-4 font-bold flex items-center">
                    <span>Admin's Clarity (Answers)</span>
                </div>
            </div>

            {/* Table Body - FIXED SCROLLING with enhanced styling */}
            <div 
                className="flex-grow overflow-y-auto bg-gray-50 chat-container" 
                ref={messagesContainerRef} 
                style={{ height: 'calc(100vh - 250px)' }}
            >
                {maxRows === 0 ? (
                    <div className="flex items-center justify-center h-full p-8">
                        <div className="text-center">
                            <div className="flex justify-center mb-4">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400">
                                    <FaUsers className="text-2xl" />
                                </div>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">No conversations yet</h3>
                            <p className="text-gray-500">Start a conversation by sending a doubt or clarity</p>
                        </div>
                    </div>
                ) : (
                    Array.from({ length: maxRows }, (_, index) => {
                        const doubt = doubts[index];
                        const clarity = clarities[index];
                        
                        return (
                            <div key={index} className="grid grid-cols-12 border-b border-gray-200 hover:bg-gray-50 group">
                                {/* Row Number */}
                                <div className="col-span-1 p-4 border-r border-gray-200 text-center text-sm font-medium text-gray-600 bg-gray-50 flex items-center justify-center">
                                    {index + 1}
                                </div>
                                
                                {/* Doubt Column */}
                                <div className="col-span-5 border-r border-gray-200">
                                    <MessageCell message={doubt} type="doubt" />
                                </div>
                                
                                {/* Clarity Column */}
                                <div className="col-span-6">
                                    <MessageCell message={clarity} type="clarity" />
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};

// ===== MAIN CHAT WINDOW =====

const ChatWindow = ({ 
    currentUser, 
    activeChat, 
    messages, 
    newMessage, 
    setNewMessage, 
    onSendMessage, 
    onDelete,
    loading,
    getNextMessageType,
    notificationsEnabled,
    setNotificationsEnabled,
    replyingTo,
    setReplyingTo,
    isMobile,
    isSidebarOpen,
    setIsSidebarOpen
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const isAdmin = currentUser?.role === 'admin';
    
    // Track if user is manually scrolling
    const isUserScrolling = useRef(false);
    const isScrollAtBottom = useRef(true);
    
    // Check if scroll is at bottom
    const checkIfScrollIsAtBottom = useCallback(() => {
        if (!messagesContainerRef.current) return true;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        return Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
    }, []);
    
    // Handle scroll events to detect manual scrolling
    const handleScroll = useCallback(() => {
        isScrollAtBottom.current = checkIfScrollIsAtBottom();
        
        // If user scrolled up (away from bottom), set flag
        if (!isScrollAtBottom.current) {
            isUserScrolling.current = true;
        } else {
            // If user scrolled back to bottom, reset flag
            isUserScrolling.current = false;
        }
    }, [checkIfScrollIsAtBottom]);
    
    // Auto-scroll to bottom - improved version
    useEffect(() => {
        // For mobile view and common chat, we have special scroll handling
        if ((isMobile || activeChat?.type === 'common') && messagesContainerRef.current) {
            const scrollContainer = messagesContainerRef.current;
            
            // Add scroll listener
            scrollContainer.addEventListener('scroll', handleScroll);
            
            // Scroll to bottom only if:
            // 1. User is at/near bottom already, OR
            // 2. This is a new message and user isn't manually scrolling
            if (isScrollAtBottom.current || !isUserScrolling.current) {
                // Use requestAnimationFrame to ensure DOM is updated
                requestAnimationFrame(() => {
                    if (messagesEndRef.current) {
                        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            }
            
            // Cleanup
            return () => {
                if (scrollContainer) {
                    scrollContainer.removeEventListener('scroll', handleScroll);
                }
            };
        } else {
            // For desktop private chat table view, let PrivateMessageTable handle scrolling
            // For other cases, use simple auto-scroll
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isMobile, activeChat, handleScroll]);
    
    // Reset scroll flag when user sends a message
    useEffect(() => {
        // When user sends a message, reset the scrolling flag to allow auto-scroll
        isUserScrolling.current = false;
        isScrollAtBottom.current = true;
    }, [newMessage]); // Reset when newMessage changes (user is typing)
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        
        // Use the provided getNextMessageType function
        const messageType = getNextMessageType();
        
        // Immediately clear the input field for better UX
        const messageText = newMessage.trim();
        setNewMessage('');
        setReplyingTo(null); // Clear reply context after sending
        
        console.log('[CLIENT] Sending message with type:', messageType, 'for role:', currentUser?.role);
        
        onSendMessage({
            text: messageText,
            messageType: messageType,
            parentDoubt: replyingTo?._id
        });
    };

    const getChatTitle = () => {
        if (activeChat?.type === 'common') {
            return 'Common Group';
        }
        return `Private Chat with ${activeChat?.peer?.name || 'Unknown'}`;
    };

    const getChatIcon = () => {
        if (activeChat?.type === 'common') {
            return <FaUsers className="text-blue-500 text-2xl" />;
        }
        return activeChat?.peer?.name === 'Admin' ? 
            <FaUserShield className="text-green-500 text-2xl" /> : 
            <FaUserNinja className="text-blue-500 text-2xl" />;
    };

    return (
        <div className={`flex flex-col flex-grow bg-gray-50 transition-all duration-300 ${
            isExpanded ? 'fixed inset-0 z-50' : ''
        }`}>
            {/* Header - Mobile responsive */}
            <div className="bg-indigo-900 p-4 border-b border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        {/* Mobile sidebar toggle */}
                        {isMobile && (
                            <button 
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="mr-3 p-2 rounded-lg hover:bg-indigo-800 text-white"
                            >
                                <FaBars />
                            </button>
                        )}
                        
                        {getChatIcon()}
                        <div className="ml-3">
                            <h3 className="text-xl font-bold text-white flex items-center mobile-text-lg">
                                {getChatTitle()}
                                {/* Show unread indicator if there are unread messages in this chat */}
                                {activeChat?.type === 'private' && activeChat?.peer?._id && (
                                    <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                )}
                            </h3>
                            <p className="text-sm text-indigo-200 mobile-text-base">
                                {activeChat?.type === 'common' 
                                    ? 'Group discussion for all members' 
                                    : 'Private doubt-clarity conversation'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Notification toggle */}
                        <button
                            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                            className={`p-2 rounded-full transition-colors ${
                                notificationsEnabled 
                                    ? 'text-white bg-indigo-700 hover:bg-indigo-600' 
                                    : 'text-indigo-300 bg-indigo-800 hover:bg-indigo-700'
                            }`}
                            title={notificationsEnabled ? "Disable notifications" : "Enable notifications"}
                        >
                            {notificationsEnabled ? <FaBell className="text-lg" /> : <FaBell className="text-lg" />}
                        </button>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 text-white hover:text-indigo-200 hover:bg-indigo-800 rounded-lg transition-colors"
                            title={isExpanded ? "Exit fullscreen" : "Enter fullscreen"}
                        >
                            {isExpanded ? <FaCompress className="text-xl" /> : <FaExpand className="text-xl" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
         <div className="flex-grow overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
    {loading ? (
        <LoadingSpinner message="Loading messages..." />
    ) : messages.length > 0 ? (
        activeChat?.type === 'common' ? (
            // Common Chat - WhatsApp style
            <div className="flex-grow overflow-y-auto p-4 bg-gray-100 chat-container" ref={messagesContainerRef} style={{ height: 'calc(100vh - 250px)' }}>
                {messages.map(msg => (
                    <CommonMessage
                        key={msg._id}
                        message={msg}
                        currentUser={currentUser}
                        onReply={setReplyingTo}
                        onDelete={onDelete}
                        isAdmin={isAdmin}
                        replyingTo={messages}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>
        ) : (
                        // Private Chat - Table style (responsive)
                        <div className="h-full flex flex-col">
                            {/* Mobile view - stacked columns */}
                            {isMobile ? (
                                <div className="flex-grow overflow-y-auto bg-white" style={{ height: 'calc(100vh - 180px)' }} ref={messagesContainerRef}>
                                    {messages
                                        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                                        .map((msg, index) => {
                                            const isDoubt = msg?.messageType === 'doubt' && msg?.userModel === 'Fighter';
                                            const isClarity = msg?.messageType === 'clarity' && msg?.userModel === 'Admin';
                                            const isOwnMessage = msg?.user?._id === currentUser?._id;
                                            const isOwnAdmin = isAdmin && isClarity;
                                            const isOwnFighter = !isAdmin && isDoubt;
                                            const isOwn = isOwnAdmin || isOwnFighter;
                                            
                                            return (
                                                <div key={msg._id} className="border-b border-gray-200 p-4">
                                                    <div className={`flex items-center justify-between mb-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                                        <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                                            {/* Removed role symbols as per requirements */}
                                                            <span className="font-medium text-sm text-gray-700">
                                                                {msg?.user?.name || 'Unknown'}
                                                            </span>
                                                        </div>
                                                        <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                                            {isAdmin && (
                                                                <button
                                                                    onClick={() => onDelete?.(msg?._id)}
                                                                    className="p-1 text-red-400 hover:text-red-600 text-xs"
                                                                    title="Delete"
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[80%] p-3 rounded-xl shadow-sm my-2 ${
                                                            isOwn
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-gray-200 text-gray-900'
                                                        }`}>
                                                            {msg?.text || ''}
                                                            <span className={`block text-xs mt-1 ${
                                                                isOwn ? 'text-right text-gray-300' : 'text-left text-gray-500'
                                                            }`}>
                                                                {msg?.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {
                                                                    hour: 'numeric',
                                                                    minute: '2-digit',
                                                                    hour12: true
                                                                }) : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    <div ref={messagesEndRef} />
                                </div>
                            ) : (
                                // Desktop view - table
                                <PrivateMessageTable
                                    messages={messages}
                                    currentUser={currentUser}
                                    onDelete={onDelete}
                                />
                            )}
                        </div>
                    )
                ) : (
                    <EmptyState
                        icon={FaUsers}
                        title="No messages yet"
                        description={
                            activeChat?.type === 'common' 
                                ? 'Start the group conversation' 
                                : 'Ask your first doubt or provide clarity'
                        }
                    />
                )}
            </div>

            {/* Message Type Indicator for Private Chat */}
            {activeChat?.type === 'private' && (
                <div className="bg-gray-50 border-t border-gray-200 p-4">
                    <div className="flex items-center justify-center space-x-6">
                        {/* Show what the current user will send */}
                    </div>
                </div>
            )}

            {/* Message Input */}
            <div className="bg-white p-4 border-t border-gray-300">
                {/* Reply Context Display */}
                {replyingTo && activeChat?.type === 'common' && (
                    <div className="mb-3 p-3 bg-gray-100 rounded-lg border border-gray-300 relative">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 mr-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                    replyingTo.userModel === 'Admin' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                                }`}>
                                    {replyingTo.userModel === 'Admin' ? 
                                        <FaUserShield className="text-xs" /> : 
                                        <FaUserNinja className="text-xs" />
                                    }
                                </div>
                            </div>
                            <div className="flex-grow min-w-0">
                                <p className="text-xs font-bold text-gray-700 truncate">
                                    {replyingTo.user?.name || 'Unknown User'}
                                </p>
                                <p className="text-xs text-gray-600 truncate">
                                    {replyingTo.text.length > 60 ? 
                                        replyingTo.text.substring(0, 60) + '...' : 
                                        replyingTo.text}
                                </p>
                            </div>
                            <button 
                                onClick={() => setReplyingTo(null)}
                                className="flex-shrink-0 text-gray-500 hover:text-gray-700 ml-2"
                                title="Cancel reply"
                            >
                                <FaTimes className="text-sm" />
                            </button>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="flex items-end space-x-3">
                    <div className="flex-grow">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={
                                activeChat?.type === 'common' 
                                    ? 'Type a message...' 
                                    : isAdmin 
                                        ? 'Type your clarity (answer)...'
                                        : 'Type your doubt (question)...'
                            }
                            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                            rows="1"
                            style={{ minHeight: '48px', maxHeight: '120px' }}
                            onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim()}
                        className={`p-3 rounded-full text-white focus:outline-none focus:ring-4 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex-shrink-0 transform hover:scale-105 ${
                            activeChat?.type === 'common' 
                                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300' 
                                : isAdmin
                                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-300'  // Admin sends clarity (green)
                                    : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-300' // Fighter sends doubt (orange)
                        }`}
                    >
                        <FaPaperPlane className="text-lg" />
                    </button>
                </form>
            </div>
        </div>
    );
};

// ===== NOTIFICATION SYSTEM =====

// WhatsApp-style notification popup component
const NotificationPopup = ({ notification, onClose, onNavigate, setReadMessages }) => {
    if (!notification) return null;
    
    return (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-sm min-w-[300px] transform transition-all duration-300 hover:scale-105">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-bold text-gray-800 text-sm">New Message</span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-lg"
                    >
                        <FaTimes className="text-xs" />
                    </button>
                </div>
                
                {/* Sender */}
                <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.messageType === 'clarity' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                        {notification.messageType === 'clarity' ? 
                            <FaUserShield className="text-xs" /> : 
                            <FaUserNinja className="text-xs" />
                        }
                    </div>
                    <div>
                        <p className="font-medium text-gray-800 text-sm">{notification.senderName}</p>
                        <p className="text-xs text-gray-500">
                            {notification.messageType === 'clarity' ? '💡 Clarity' : '🤔 Doubt'} • {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                
                {/* Message preview */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-sm text-gray-700 line-clamp-2">
                        {notification.text.length > 80 ? 
                            notification.text.substring(0, 80) + '...' : 
                            notification.text
                        }
                    </p>
                </div>
                
                {/* Action */}
                <div className="mt-3 flex space-x-2">
                    <button 
                        onClick={onClose}
                        className="flex-1 text-center py-2 text-gray-600 hover:text-gray-800 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Dismiss
                    </button>
                    <button 
                        onClick={() => {
                            // Mark the message as read when navigating to the chat
                            // Use callback form to avoid dependency issues
                            setReadMessages(prev => {
                                const newSet = new Set(prev);
                                newSet.add(notification.id);
                                return newSet;
                            });
                            onNavigate();
                        }}
                        className="flex-1 text-center py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        View Chat
                    </button>
                </div>
            </div>
        </div>
    );
};

// Notification center component for showing notification history
const NotificationCenter = ({ notifications, onClose, onClearAll, onNotificationClick, setReadMessages }) => {
    if (!notifications || notifications.length === 0) return null;
    
    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-sm w-full max-h-96 overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <FaBell className="text-blue-500" />
                        <span className="font-bold text-gray-800">Notifications</span>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                            {notifications.length}
                        </span>
                    </div>
                    <div className="flex space-x-2">
                        <button 
                            onClick={onClearAll}
                            className="text-xs text-gray-500 hover:text-gray-700"
                        >
                            Clear All
                        </button>
                        <button 
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
                
                {/* Notification List */}
                <div className="space-y-2">
                    {notifications.map((notif, index) => (
                        <div 
                            key={index} 
                            className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => {
                                // Mark as read and navigate
                                // Use callback form to avoid dependency issues
                                setReadMessages(prev => {
                                    const newSet = new Set(prev);
                                    newSet.add(notif.id);
                                    return newSet;
                                });
                                onNotificationClick(notif);
                            }}
                        >
                            <div className="flex items-start space-x-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    notif.messageType === 'clarity' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                }`}>
                                    {notif.messageType === 'clarity' ? 
                                        <FaUserShield className="text-xs" /> : 
                                        <FaUserNinja className="text-xs" />
                                    }
                                </div>
                                <div className="flex-grow">
                                    <p className="font-medium text-gray-800 text-sm">{notif.senderName}</p>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                        {notif.text}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ===== MAIN COMPONENT =====

const AskDoubtPageDesktop = ({ 
    // Shared state from parent
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
    handleSendMessage: parentHandleSendMessage,
    handleDeleteMessage: parentHandleDeleteMessage,
    getFilteredMessages: parentGetFilteredMessages,
    getNextMessageType: parentGetNextMessageType,
    // Notification props
    notification,
    setNotification,
    notifications,
    setNotifications,
    notificationsEnabled,
    setNotificationsEnabled
}) => {
    // Local state that's specific to this component
    const [isMobile, setIsMobile] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showNotificationCenter, setShowNotificationCenter] = useState(false);
    const messagesEndRef = useRef(null);
    const processedNotificationsRef = useRef(new Set());
    const isAdmin = currentUser?.role === 'admin';
    
    // Detect mobile devices
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        
        return () => {
            window.removeEventListener('resize', checkIsMobile);
            // Clear processed notifications on unmount
            processedNotificationsRef.current.clear();
        };
    }, []);
    
    // Close sidebar when switching chats on mobile
    useEffect(() => {
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    }, [activeChat, isMobile]);
    
    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
                
                // Check if we've already processed this notification
                const alreadyProcessed = processedNotificationsRef.current.has(lastMessage._id);
                
                if (!notificationExists && !alreadyProcessed) {
                    //console.log('[NOTIFICATION] Showing new notification for message:', lastMessage._id);
                    showNotification(lastMessage, senderName);
                    // Mark message as notified but not yet read
                    // Use a ref instead of state to avoid infinite loop
                    processedNotificationsRef.current.add(lastMessage._id);
                }
            }
        }
    }, [messages, currentUser, activeChat, notifications, readMessages, showNotification]);

    // Mark messages as read when chat is active
    useEffect(() => {
        let isMounted = true;
        
        const markChatAsRead = async () => {
            if (activeChat?.type === 'private' && activeChat?.peer?._id) {
                const peerId = activeChat.peer._id;
                
                try {
                    // Mark all messages in this chat as read in the database
                    await api.post('/doubts/mark-chat-read', { chatUserId: peerId });
                    
                    if (!isMounted) return;
                    
                    // Update local state
                    setLastSeenMessages(prev => ({
                        ...prev,
                        [peerId]: Date.now()
                    }));
                    
                    // Clear unread count for this chat
                    setUnreadCounts(prev => {
                        const newCounts = { ...prev };
                        delete newCounts[peerId];
                        return newCounts;
                    });
                    
                    // Refresh messages to get updated isRead status
                    const { data: updatedMessages } = await api.get('/doubts');
                    if (!isMounted) return;
                    
                    setMessages(updatedMessages);
                    
                    // Update read messages set
                    setReadMessages(prev => {
                        const newReadMessages = new Set(prev);
                        updatedMessages.forEach(msg => {
                            if (msg.isRead || (msg.user?._id?.toString() !== currentUser._id.toString())) {
                                newReadMessages.add(msg._id);
                            }
                        });
                        return newReadMessages;
                    });
                } catch (error) {
                    console.error('Error marking chat as read:', error);
                }
            } else if (activeChat?.type === 'common') {
                // For common chat, just update the read status locally
                const commonMessages = messages.filter(msg => !msg.recipientId);
                setReadMessages(prev => {
                    const newReadMessages = new Set(prev);
                    commonMessages.forEach(msg => {
                        if (msg.user?._id?.toString() !== currentUser._id.toString()) {
                            newReadMessages.add(msg._id);
                        }
                    });
                    return newReadMessages;
                });
            }
        };

        if (activeChat) {
            markChatAsRead();
        }
        
        return () => {
            isMounted = false;
            // Clear processed notifications on unmount
            processedNotificationsRef.current.clear();
        };
    }, [activeChat, setMessages, setReadMessages, setLastSeenMessages, setUnreadCounts, messages, currentUser]);

    // Use the calculateUnreadCounts function from parent component

    // Determine next message type based on conversation flow
    const getNextMessageType = useCallback(() => {
        return parentGetNextMessageType();
    }, [parentGetNextMessageType]);
    
    // ===== COMPONENT LOGIC =====

    // Send message
    const handleSendMessage = async (messageData) => {
        parentHandleSendMessage(messageData);
    };

    // Delete message
    const handleDeleteMessage = async (messageId) => {
        parentHandleDeleteMessage(messageId);
    };

    // Clear all notifications
    const clearAllNotifications = () => {
        setNotifications([]);
        localStorage.setItem('notifications', JSON.stringify([]));
    };

    // Handle notification click (navigate to chat)
    const handleNotificationClick = (notif) => {
        if (notif.senderId) {
            // Determine if this is a private or common chat notification
            // For now, we'll assume private chat notifications have a senderId that's not the admin
            // and common chat notifications are from the admin or are general messages
            setActiveChat({ 
                type: 'private', 
                peer: { _id: notif.senderId, name: notif.senderName } 
            });
        }
        setShowNotificationCenter(false);
        setNotification(null);
    };

    // Update document title when unreadCounts change
    useEffect(() => {
        // Also update the document title to show unread count
        const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
        if (totalUnread > 0) {
            document.title = `(${totalUnread}) Chat App`;
        } else {
            document.title = 'Chat App';
        }
    }, [unreadCounts]);

    // Loading state
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner message="Initializing chat..." />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
                    <FaExclamationCircle className="text-6xl text-red-500 mb-4 mx-auto" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const filteredMessages = parentGetFilteredMessages();

    // ===== RENDER LOGIC =====

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Overlay for mobile sidebar */}
            {isMobile && isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}
            
            {/* Sidebar */}
            <ChatSidebar 
                currentUser={currentUser}
                fighters={fighters}
                activeChat={activeChat}
                setActiveChat={setActiveChat}
                adminId={adminId}
                unreadCounts={unreadCounts}
                isMobile={isMobile}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                messages={messages} // Pass messages to enable dynamic sorting
            />
            
            {/* Main Chat Window */}
            <ChatWindow
                currentUser={currentUser}
                activeChat={activeChat}
                messages={filteredMessages}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                onSendMessage={handleSendMessage}
                onDelete={handleDeleteMessage}
                loading={loading}
                getNextMessageType={getNextMessageType}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                isMobile={isMobile}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                notificationsEnabled={notificationsEnabled}
                setNotificationsEnabled={setNotificationsEnabled}
            />
            
            {/* Notification Popup */}
            {notification && (
                <NotificationPopup 
                    notification={notification}
                    onClose={() => setNotification(null)}
                    onNavigate={() => {
                        // Navigate to the chat with the sender
                        if (notification.senderId) {
                            setActiveChat({ 
                                type: 'private', 
                                peer: { _id: notification.senderId, name: notification.senderName } 
                            });
                        }
                        setNotification(null);
                    }}
                    setReadMessages={setReadMessages}
                />
            )}
            
            {/* Notification Center Button */}
            <button
                onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-colors z-40"
            >
                <FaBell className="text-lg" />
                {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                        {notifications.length}
                    </span>
                )}
            </button>
            
            {/* Notification Center */}
            {showNotificationCenter && (
                <NotificationCenter 
                    notifications={notifications}
                    onClose={() => setShowNotificationCenter(false)}
                    onClearAll={clearAllNotifications}
                    onNotificationClick={handleNotificationClick}
                    setReadMessages={setReadMessages}
                />
            )}
        </div>
    );
};

export default AskDoubtPageDesktop;