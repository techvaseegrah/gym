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
    FaSpinner,
    FaClock,
    FaDotCircle,
    FaExclamationCircle,
    FaBell,
    FaBars,
    FaChevronLeft
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

// ===== MOBILE TAB NAVIGATION COMPONENTS =====

// Mock components for the different views
const CommonChatView = ({ 
    currentUser, 
    messages, 
    newMessage, 
    setNewMessage, 
    onSendMessage, 
    onDelete,
    loading,
    getNextMessageType,
    replyingTo,
    setReplyingTo,
    isAdmin,
    isMobile,
    isSidebarOpen,
    setIsSidebarOpen
}) => {
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    
    // Auto-scroll to bottom - improved version
    useEffect(() => {
        if (messagesEndRef.current && messagesContainerRef.current) {
            // Use requestAnimationFrame to ensure DOM is updated
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                // Also ensure the container is scrolled to bottom
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            });
        }
    }, [messages]);
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        
        // Use the provided getNextMessageType function
        const messageType = getNextMessageType();
        
        // Immediately clear the input field for better UX
        const messageText = newMessage.trim();
        setNewMessage('');
        setReplyingTo(null); // Clear reply context after sending
        
        onSendMessage({
            text: messageText,
            messageType: messageType,
            parentDoubt: replyingTo?._id
        });
    };
    
    // Mobile version of CommonMessage for better mobile responsiveness
    const MobileCommonMessage = ({ message, currentUser, onReply, onDelete, isAdmin, replyingTo }) => {
        const [showActions, setShowActions] = useState(false);
        const isOwnMessage = message?.user?._id === currentUser?._id;
        const isAdminMessage = message?.userModel === 'Admin';
        const isReply = !!message?.parentDoubt;
        
        // Find the replied-to message if this is a reply
        const repliedToMessage = isReply && replyingTo ? replyingTo.find(m => m._id === message.parentDoubt) : null;

        return (
            <div 
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 group`}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
            >
                <div className={`flex items-end gap-2 max-w-full ${isOwnMessage ? 'flex-row-reverse' : ''} relative`}>
                    {/* Avatar - smaller on mobile */}
                    <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                            isAdminMessage ? 'bg-blue-500' : 'bg-green-500'
                        }`}>
                            {isAdminMessage ? 
                                <FaUserShield className="text-white text-xs" /> : 
                                <FaUserNinja className="text-white text-xs" />
                            }
                        </div>
                    </div>

                    {/* Message Bubble - adjusted for mobile */}
                    <div className={`px-3 py-2 rounded-2xl shadow-sm max-w-[80%] transition-all duration-200 ${
                        isOwnMessage 
                            ? 'bg-blue-500 text-white rounded-br-sm' 
                            : 'bg-gray-100 text-gray-800 border border-gray-200 rounded-bl-sm'
                    }`}>
                        {/* Reply context display */}
                        {repliedToMessage && (
                            <div className="mb-1 p-2 bg-blue-100 rounded-lg border-l-2 border-blue-500">
                                <p className="text-xs font-bold text-blue-800 truncate mobile-text-xs">
                                    {repliedToMessage.user?.name || 'Unknown User'}
                                </p>
                                <p className="text-xs text-blue-700 truncate mobile-text-xs">
                                    {repliedToMessage.text.length > 30 ? 
                                        repliedToMessage.text.substring(0, 30) + '...' : 
                                        repliedToMessage.text}
                                </p>
                            </div>
                        )}
                        
                        <p className={`text-xs font-bold mb-1 ${isOwnMessage ? 'text-blue-100' : 'text-blue-600'} mobile-text-sm`}>
                            {isOwnMessage ? 'You' : message?.user?.name || 'Unknown User'}
                        </p>
                        
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mobile-text-base">
                            {message?.text || ''}
                        </p>
                        
                        <div className="flex items-center justify-between mt-1">
                            <p className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'} mobile-text-xs`}>
                                {message?.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }) : ''}
                            </p>
                        </div>
                    </div>

                    {/* Action buttons - adjusted for mobile */}
                    {showActions && (
                        <div className={`absolute bottom-0 ${isOwnMessage ? 'left-0' : 'right-0'} transform ${
                            isOwnMessage ? '-translate-x-full' : 'translate-x-full'
                        } flex space-x-1 bg-gray-800 rounded-lg p-1 shadow-lg z-20`}>
                            <button
                                onClick={() => onReply?.(message)}
                                className="p-1 text-white hover:bg-gray-700 rounded text-xs transition-colors"
                                title="Reply"
                            >
                                <FaReply />
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => onDelete?.(message?._id)}
                                    className="p-1 text-red-400 hover:bg-red-600 hover:text-white rounded text-xs transition-colors"
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

    return (
        <div className="flex flex-col h-full">
            {/* Common Chat - WhatsApp style (mobile optimized) */}
            <div ref={messagesContainerRef} className="flex-grow overflow-y-auto p-3 bg-gray-100 mobile-padding-sm chat-container" style={{ height: 'calc(100vh - 180px)' }}>
                {loading ? (
                    <LoadingSpinner message="Loading messages..." />
                ) : messages.length > 0 ? (
                    <>
                        {messages.map(msg => (
                            <MobileCommonMessage
                                key={msg._id}
                                message={msg}
                                currentUser={currentUser}
                                onReply={setReplyingTo}
                                onDelete={onDelete}
                                isAdmin={isAdmin}
                                replyingTo={messages} // Pass all messages to find replied-to message
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                ) : (
                    <EmptyState
                        icon={FaUsers}
                        title="No messages yet"
                        description="Ask your first doubt or provide clarity"
                    />
                )}
            </div>

            {/* Message Input */}
            <div className="bg-white p-3 border-t border-gray-300">
                {/* Reply Context Display */}
                {replyingTo && (
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
                                <p className="text-xs font-bold text-gray-700 truncate mobile-text-sm">
                                    {replyingTo.user?.name || 'Unknown User'}
                                </p>
                                <p className="text-xs text-gray-600 truncate mobile-text-sm">
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
                
                <form onSubmit={handleSubmit} className="flex items-end space-x-2">
                    <div className="flex-grow">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 mobile-text-base"
                            rows="1"
                            style={{ minHeight: '40px', maxHeight: '100px' }}
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
                            'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'
                        }`}
                    >
                        <FaPaperPlane className="text-lg" />
                    </button>
                </form>
            </div>
        </div>
    );
};

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

const PrivateChatListView = ({ 
    currentUser, 
    fighters, 
    activeChat, 
    setActiveChat, 
    adminId, 
    unreadCounts = {},
    isAdmin,
    messages  // Add messages prop
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Calculate latest message timestamp for each fighter (same logic as desktop)
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
                    <h4 className={`font-medium ${isActive ? 'text-blue-700' : hasUnread ? 'text-gray-800' : 'text-gray-700'} mobile-text-lg truncate`}>
                        {title}
                        {hasUnread && (
                            <span className="ml-2 text-green-600 text-sm">• New</span>
                        )}
                    </h4>
                    <p className={`text-sm ${isActive ? 'text-blue-600' : hasUnread ? 'text-gray-600' : 'text-gray-500'} mobile-text-base truncate`}>
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

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-bold text-center mobile-text-lg">
                    {isAdmin ? '💬 Doubt Management' : '🤔 Ask Doubts'}
                </h2>
                <p className="text-sm text-gray-600 text-center mt-1 mobile-text-base">
                    {isAdmin ? 'Admin Panel' : 'Get Help & Clarity'}
                </p>
            </div>

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
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 text-sm mobile-text-base"
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
            <div className="flex-grow overflow-y-auto h-[calc(100vh-120px)]">
                {/* Common Group */}
                <ChatItem
                    chat={{ type: 'common' }}
                    isActive={activeChat?.type === 'common'}
                    onClick={() => setActiveChat({ type: 'common', peer: { _id: null, name: 'Common Group' } })}
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
                                setActiveChat({ type: 'private', peer: fighter });
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
                            setActiveChat({ type: 'private', peer: { _id: adminId, name: 'Admin' } });
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

// Mobile version of PrivateMessageTable
const PrivateMessageMobile = ({ messages, currentUser, onDelete }) => {
    const isAdmin = currentUser?.role === 'admin';
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    
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
        }
    }, [checkIfScrollIsAtBottom]);
    
    // Auto-scroll to bottom - improved version
    useEffect(() => {
        const scrollContainer = messagesContainerRef.current;
        if (!scrollContainer) return;
        
        // Add scroll listener
        scrollContainer.addEventListener('scroll', handleScroll);
        
        // Scroll to bottom only if user is near bottom or hasn't scrolled up
        if (!isUserScrolling.current || isScrollAtBottom.current) {
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
    }, [messages, handleScroll]);
    
    // Reset scroll flag when user sends a message (when messages change)
    useEffect(() => {
        // Reset flag when new messages arrive (indicating user might want to see them)
        const wasUserScrolling = isUserScrolling.current;
        isUserScrolling.current = false;
        
        // If user was scrolling and new messages arrive, we still want to scroll to bottom
        // only if they're already near the bottom
        if (wasUserScrolling) {
            // Check if we should scroll to bottom based on current position
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
                    const isNearBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 100;
                    if (isNearBottom) {
                        isUserScrolling.current = false;
                    }
                }
            }, 100);
        }
    }, [messages.length]); // Reset when message count changes
    
    // Sort all messages by timestamp
    const sortedMessages = [...messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return (
        <div ref={messagesContainerRef} className="flex-grow overflow-y-auto bg-white chat-container" style={{ height: 'calc(100vh - 180px)' }}>
            {sortedMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full p-8">
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400">
                                <FaUsers className="text-2xl" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2 mobile-text-lg">No conversations yet</h3>
                        <p className="text-gray-500 mobile-text-base">Start a conversation by sending a doubt or clarity</p>
                    </div>
                </div>
            ) : (
                <>
                    {sortedMessages.map((msg) => {
                        const isDoubt = msg?.messageType === 'doubt' && msg?.userModel === 'Fighter';
                        const isClarity = msg?.messageType === 'clarity' && msg?.userModel === 'Admin';
                        const isOwnMessage = msg?.user?._id === currentUser?._id;
                        const isOwnAdmin = isAdmin && isClarity;
                        const isOwnFighter = !isAdmin && isDoubt;
                        const isOwn = isOwnAdmin || isOwnFighter;
                        
                        return (
                            <div key={msg._id} className="border-b border-gray-200 p-4">
                                {/* User info and actions */}
                                <div className={`flex items-center justify-between mb-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                    <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                        <span className="font-medium text-sm text-gray-700 mobile-text-sm">
                                            {msg?.user?.name || 'Unknown'}
                                        </span>
                                    </div>
                                    <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                        {isAdmin && (
                                            <button
                                                onClick={() => onDelete?.(msg?._id)}
                                                className="p-1 text-red-400 hover:text-red-600 text-xs mobile-text-sm"
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
                </>
            )}
        </div>
    );
};

const PrivateChatView = ({ 
    currentUser, 
    activeChat,
    messages, 
    newMessage, 
    setNewMessage, 
    onSendMessage, 
    onDelete,
    loading,
    getNextMessageType,
    isAdmin
}) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        
        // Use the provided getNextMessageType function
        const messageType = getNextMessageType();
        
        // Immediately clear the input field for better UX
        const messageText = newMessage.trim();
        setNewMessage('');
        
        onSendMessage({
            text: messageText,
            messageType: messageType
        });
    };

    const getChatTitle = () => {
        return `Private Chat with ${activeChat?.peer?.name || 'Unknown'}`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-indigo-900 p-4 border-b border-gray-200 shadow-sm">
                <div className="flex items-center">
                    <div className="ml-0">
                        <h3 className="text-xl font-bold text-white flex items-center mobile-text-lg">
                            {getChatTitle()}
                        </h3>
                        <p className="text-sm text-indigo-200 mobile-text-base">
                            Private doubt-clarity conversation
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-hidden">
                {loading ? (
                    <LoadingSpinner message="Loading messages..." />
                ) : messages.length > 0 ? (
                    <PrivateMessageMobile
                        messages={messages}
                        currentUser={currentUser}
                        onDelete={onDelete}
                    />
                ) : (
                    <EmptyState
                        icon={FaUsers}
                        title="No messages yet"
                        description="Ask your first doubt or provide clarity"
                    />
                )}
            </div>

            {/* Message Type Indicator for Private Chat */}
            <div className="bg-gray-50 border-t border-gray-200 p-3">
            </div>

            {/* Message Input */}
            <div className="bg-white p-3 border-t border-gray-200">
                <form onSubmit={handleSubmit} className="flex items-end space-x-2">
                    <div className="flex-grow">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={
                                isAdmin 
                                    ? 'Type your clarity (answer)...'
                                    : 'Type your doubt (question)...'
                            }
                            className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 mobile-text-base"
                            rows="1"
                            style={{ minHeight: '40px', maxHeight: '100px' }}
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
                            isAdmin
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

const NotificationsView = ({ notifications, setNotification, onNotificationClick, setReadMessages }) => {
    const clearAllNotifications = () => {
        setNotification(null);
    };

    if (!notifications || notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
                <FaBell className="text-6xl text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2 mobile-text-lg">No notifications</h3>
                <p className="text-gray-500 mobile-text-base">You're all caught up!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h2 className="text-xl font-bold mobile-text-lg">Notifications</h2>
                <button 
                    onClick={clearAllNotifications}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    Clear All
                </button>
            </div>

            {/* Notification List */}
            <div className="flex-grow overflow-y-auto h-[calc(100vh-120px)]">
                {notifications.map((notif, index) => (
                    <div 
                        key={index} 
                        className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                            // Mark as read and navigate
                            setReadMessages(prev => {
                                const newSet = new Set(prev);
                                newSet.add(notif.id);
                                return newSet;
                            });
                            onNotificationClick(notif);
                        }}
                    >
                        <div className="flex items-start space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                notif.messageType === 'clarity' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                            }`}>
                                {notif.messageType === 'clarity' ? 
                                    <FaUserShield className="text-sm" /> : 
                                    <FaUserNinja className="text-sm" />
                                }
                            </div>
                            <div className="flex-grow">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium text-gray-800 mobile-text-base">{notif.senderName}</p>
                                    <span className="text-xs text-gray-500">
                                        {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 mobile-text-sm">
                                    {notif.messageType === 'clarity' ? '💡 Clarity' : '🤔 Doubt'}
                                </p>
                                <p className="text-sm text-gray-800 mt-2 line-clamp-2 mobile-text-base">
                                    {notif.text}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ===== MAIN COMPONENT =====

const AskDoubtPageMobile = ({ 
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
    const [activeTab, setActiveTab] = useState('common');
    const [isMobile, setIsMobile] = useState(true); // Always mobile in this component
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const processedNotificationsRef = useRef(new Set());
    const isAdmin = currentUser?.role === 'admin';

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

    // Render the component based on active tab
    const renderActiveTab = () => {
        switch (activeTab) {
            case 'notifications':
                return (
                    <NotificationsView 
                        notifications={notifications}
                        setNotification={setNotification}
                        onNotificationClick={handleNotificationClick}
                        setReadMessages={setReadMessages}
                    />
                );
            case 'private':
                // If we're in the private chat list view
                if (!activeChat || activeChat.type !== 'private' || !activeChat.peer?._id) {
                    return (
                        <PrivateChatListView 
                            currentUser={currentUser}
                            fighters={fighters}
                            activeChat={activeChat}
                            setActiveChat={(chat) => {
                                setActiveChat(chat);
                                // Switch to common tab if common group is selected
                                if (chat?.type === 'common') {
                                    setActiveTab('common');
                                }
                            }}
                            adminId={adminId}
                            unreadCounts={unreadCounts}
                            isAdmin={isAdmin}
                            messages={messages}  // Add messages prop
                        />
                    );
                } else {
                    // If we're in a specific private chat
                    return (
                        <PrivateChatView
                            currentUser={currentUser}
                            activeChat={activeChat}
                            messages={parentGetFilteredMessages()}
                            newMessage={newMessage}
                            setNewMessage={setNewMessage}
                            onSendMessage={parentHandleSendMessage}
                            onDelete={parentHandleDeleteMessage}
                            loading={loading}
                            getNextMessageType={parentGetNextMessageType}
                            isAdmin={isAdmin}
                        />
                    );
                }
            case 'common':
            default:
                // If we're in the common chat
                if (activeChat?.type === 'common') {
                    return (
                        <CommonChatView
                            currentUser={currentUser}
                            messages={parentGetFilteredMessages()}
                            newMessage={newMessage}
                            setNewMessage={setNewMessage}
                            onSendMessage={parentHandleSendMessage}
                            onDelete={parentHandleDeleteMessage}
                            loading={loading}
                            getNextMessageType={parentGetNextMessageType}
                            replyingTo={replyingTo}
                            setReplyingTo={setReplyingTo}
                            isAdmin={isAdmin}
                            isMobile={isMobile}
                            isSidebarOpen={isSidebarOpen}
                            setIsSidebarOpen={setIsSidebarOpen}
                        />
                    );
                } else {
                    // Show chat list for common group selection
                    return (
                        <PrivateChatListView 
                            currentUser={currentUser}
                            fighters={fighters}
                            activeChat={activeChat}
                            setActiveChat={(chat) => {
                                setActiveChat(chat);
                                // Switch to common tab if common group is selected
                                if (chat?.type === 'common') {
                                    setActiveTab('common');
                                }
                            }}
                            adminId={adminId}
                            unreadCounts={unreadCounts}
                            isAdmin={isAdmin}
                        />
                    );
                }
        }
    };

    // Handle back button for chat views
    const handleBack = () => {
        if (activeTab === 'common' && activeChat?.type !== 'common') {
            // Go back to common group chat
            setActiveChat({ type: 'common', peer: { _id: null, name: 'Common Group' } });
        } else if (activeTab === 'private' && activeChat?.type === 'private' && activeChat?.peer?._id) {
            // Go back to private chat list
            setActiveChat({ type: 'common', peer: { _id: null, name: 'Common Group' } });
        }
    };

    // Show back button conditionally
    const showBackButton = () => {
        if (activeTab === 'common' && activeChat?.type !== 'common') {
            return true;
        }
        if (activeTab === 'private' && activeChat?.type === 'private' && activeChat?.peer?._id) {
            return true;
        }
        return false;
    };

    // Handle notification click (navigate to chat)
    const handleNotificationClick = (notif) => {
        if (notif.senderId) {
            // Determine if this is a private or common chat notification
            setActiveChat({ 
                type: 'private', 
                peer: { _id: notif.senderId, name: notif.senderName } 
            });
            setActiveTab('private');
        }
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

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        {showBackButton() && (
                            <button 
                                onClick={handleBack}
                                className="mr-3 p-2 rounded-lg hover:bg-gray-100"
                            >
                                <FaChevronLeft />
                            </button>
                        )}
                        <h3 className="text-xl font-bold text-gray-800 mobile-text-lg">
                            {activeTab === 'common' ? 'Common Chat' : 
                             activeTab === 'private' ? 'Private Chats' : 
                             'Notifications'}
                        </h3>
                    </div>
                    {activeTab === 'notifications' && notifications.length > 0 && (
                        <button 
                            onClick={() => setNotifications([])}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Main content area that changes based on the active tab */}
            <div className="flex-grow overflow-hidden">
                {renderActiveTab()}
            </div>

            {/* Bottom Tab Navigator */}
            <div className="flex justify-around items-center bg-white border-t border-gray-200 p-2">
                <button 
                    onClick={() => {
                        setActiveTab('common');
                        setActiveChat({ type: 'common', peer: { _id: null, name: 'Common Group' } });
                    }} 
                    className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'common' ? 'text-blue-600' : 'text-gray-500'}`}
                >
                    <FaUsers size={20} />
                    <span className="text-xs mt-1">Common</span>
                </button>
                <button 
                    onClick={() => {
                        setActiveTab('private');
                        // Don't automatically select a chat, show the list first
                        // BUT ensure we reset the activeChat to show the list view
                        if (activeChat?.type === 'private' && activeChat?.peer?._id) {
                            // If we're currently in a private chat, reset to show the list
                            setActiveChat({ type: 'common', peer: { _id: null, name: 'Common Group' } });
                        }
                    }} 
                    className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'private' ? 'text-blue-600' : 'text-gray-500'}`}
                >
                    <FaUserShield size={20} />
                    <span className="text-xs mt-1">Private</span>
                </button>
                <button 
                    onClick={() => setActiveTab('notifications')} 
                    className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'notifications' ? 'text-blue-600' : 'text-gray-500'}`}
                >
                    <div className="relative">
                        <FaBell size={20} />
                        {notifications.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                {notifications.length}
                            </span>
                        )}
                    </div>
                    <span className="text-xs mt-1">Notifications</span>
                </button>
            </div>
        </div>
    );
};

export default AskDoubtPageMobile;