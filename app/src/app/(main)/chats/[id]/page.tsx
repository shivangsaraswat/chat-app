'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, Spinner } from '@chat-app/ui';
import { ArrowLeft, Send, Paperclip, Smile, MoreVertical, Trash2, X, Eye } from 'lucide-react';
import { useAuth, useSocket } from '@/components/providers';
import { formatMessageTime } from '@chat-app/utils';
import { ConversationProfileModal } from '@/components/conversation-profile-modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Message {
    id: string;
    type: string;
    content: string | null;
    isViewOnce: boolean;
    isDisappearing: boolean;
    sender: {
        id: string;
        username?: string;
        displayName?: string;
        photoUrl?: string;
    };
    media: Array<{
        id: string;
        url: string;
        mimeType: string;
    }>;
    createdAt: string;
    deletedAt?: string;
    viewedAt?: string;  // Server-side tracking for view-once
}

interface Participant {
    id: string;
    username?: string;
    displayName?: string;
    photoUrl?: string;
}

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const conversationId = params.id as string;

    const { tokens, user, isAuthenticated, isLoading: authLoading } = useAuth();
    const { socket, isConnected, joinRoom, leaveRoom, sendTypingStart, sendTypingStop } = useSocket();

    const [messages, setMessages] = useState<Message[]>([]);
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
    const [showDeleteMenu, setShowDeleteMenu] = useState(false);

    // Follow status for messaging
    const [followStatus, setFollowStatus] = useState<{
        canMessage: boolean;
        iAmFollowing: boolean;
        theyAreFollowing: boolean;
        myRequestPending: boolean;
        theirRequestPending: boolean;
    } | null>(null);

    // Conversation profile modal
    const [showProfileModal, setShowProfileModal] = useState(false);

    // File upload - support multiple files
    const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string | null }[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // View-once popup state
    const [viewingOnceMessage, setViewingOnceMessage] = useState<string | null>(null);

    // View-once sending option (only for single images)
    const [sendAsViewOnce, setSendAsViewOnce] = useState(false);
    const [fileSizeError, setFileSizeError] = useState<string | null>(null);

    // Fullscreen image viewer
    const [viewingImages, setViewingImages] = useState<{ urls: string[]; index: number } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch conversation and messages
    useEffect(() => {
        if (!tokens?.accessToken || !conversationId) return;

        const fetchData = async () => {
            try {
                // Fetch conversation details
                const convRes = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
                    headers: { Authorization: `Bearer ${tokens.accessToken}` },
                });
                const convData = await convRes.json();
                if (convData.success) {
                    setParticipant(convData.data.participant);
                } else {
                    console.error('Failed to fetch conversation:', convData);
                    router.replace('/chats');
                    return;
                }

                // Fetch messages
                const msgRes = await fetch(
                    `${API_URL}/api/conversations/${conversationId}/messages?limit=50`,
                    { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
                );
                const msgData = await msgRes.json();
                if (msgData.success) {
                    setMessages(msgData.data.items.reverse());
                    setHasMore(msgData.data.hasMore);
                    setNextCursor(msgData.data.nextCursor);
                }
            } catch (error) {
                console.error('Error fetching chat data:', error);
                router.replace('/chats');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [tokens?.accessToken, conversationId, router]);

    // Fetch follow status
    useEffect(() => {
        if (!tokens?.accessToken || !participant?.id) return;

        const fetchFollowStatus = async () => {
            try {
                const res = await fetch(`${API_URL}/api/follows/status/${participant.id}`, {
                    headers: { Authorization: `Bearer ${tokens.accessToken}` },
                });
                const data = await res.json();
                if (data.success) {
                    setFollowStatus(data.data);
                }
            } catch (error) {
                console.error('Error fetching follow status:', error);
            }
        };

        fetchFollowStatus();
    }, [tokens?.accessToken, participant?.id]);

    // Join socket room when connected
    useEffect(() => {
        if (conversationId && isConnected) {
            joinRoom(conversationId);
            return () => {
                leaveRoom(conversationId);
            };
        }
    }, [conversationId, isConnected, joinRoom, leaveRoom]);

    // Listen for new messages and typing from socket
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (data: { conversationId: string; message: Message }) => {
            if (data.conversationId === conversationId) {
                setMessages((prev) => {
                    // Check if real message already exists
                    const exists = prev.some(m => m.id === data.message.id);
                    if (exists) return prev;

                    // Remove any temp messages (optimistic) when real message from same sender arrives
                    const withoutTemp = prev.filter(m => !m.id.startsWith('temp-'));
                    return [...withoutTemp, data.message];
                });
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        };

        const handleTypingStart = (data: { conversationId: string; userId: string }) => {
            if (data.conversationId === conversationId && data.userId !== user?.id) {
                setIsTyping(true);
            }
        };

        const handleTypingStop = (data: { conversationId: string; userId: string }) => {
            if (data.conversationId === conversationId && data.userId !== user?.id) {
                setIsTyping(false);
            }
        };

        const handleMessageDeleted = (data: { conversationId: string; messageId: string; forEveryone: boolean }) => {
            if (data.conversationId === conversationId) {
                if (data.forEveryone) {
                    setMessages((prev) => prev.map(m =>
                        m.id === data.messageId
                            ? { ...m, content: null, deletedAt: new Date().toISOString() }
                            : m
                    ));
                }
            }
        };

        // Listen for view-once message being viewed (real-time update for sender)
        const handleMessageViewed = (data: { conversationId: string; messageId: string; viewedAt: string }) => {
            if (data.conversationId === conversationId) {
                setMessages((prev) => prev.map(m =>
                    m.id === data.messageId
                        ? { ...m, viewedAt: data.viewedAt }
                        : m
                ));
            }
        };

        socket.on('message:new', handleNewMessage);
        socket.on('typing:start', handleTypingStart);
        socket.on('typing:stop', handleTypingStop);
        socket.on('message:deleted', handleMessageDeleted);
        socket.on('message:viewed', handleMessageViewed);

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('typing:start', handleTypingStart);
            socket.off('typing:stop', handleTypingStop);
            socket.off('message:deleted', handleMessageDeleted);
            socket.off('message:viewed', handleMessageViewed);
        };
    }, [socket, conversationId, user?.id]);

    // Scroll to bottom on initial load
    useEffect(() => {
        if (!isLoading && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView();
        }
    }, [isLoading]);

    // Handle typing indicator
    const handleTyping = useCallback(() => {
        if (!isConnected) return;
        sendTypingStart(conversationId);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            sendTypingStop(conversationId);
        }, 2000);
    }, [conversationId, isConnected, sendTypingStart, sendTypingStop]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        // Handle file upload if there are selected files
        if (selectedFiles.length > 0) {
            await handleFileSend();
            return;
        }

        if (!messageText.trim() || isSending || !tokens?.accessToken) return;

        const text = messageText.trim();

        // Create optimistic message
        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            type: 'TEXT',
            content: text,
            isViewOnce: false,
            isDisappearing: false,
            sender: {
                id: user?.id || '',
                username: undefined,
                displayName: undefined,
                photoUrl: undefined,
            },
            media: [],
            createdAt: new Date().toISOString(),
        };

        // Immediately add to UI (optimistic)
        setMessages((prev) => [...prev, optimisticMessage]);
        setMessageText('');
        setIsSending(true);
        sendTypingStop(conversationId);

        // Scroll to bottom immediately
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 10);

        try {
            const res = await fetch(
                `${API_URL}/api/conversations/${conversationId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${tokens.accessToken}`,
                    },
                    body: JSON.stringify({ type: 'TEXT', content: text }),
                }
            );

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Failed to send message - Status:', res.status, 'Body:', errorText);
                // Remove optimistic message on failure
                setMessages((prev) => prev.filter(m => m.id !== optimisticMessage.id));
                setMessageText(text);
            } else {
                // Message sent successfully - the socket event will add the real message
                // Remove optimistic message when real one arrives (handled in socket listener)
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove optimistic message on failure
            setMessages((prev) => prev.filter(m => m.id !== optimisticMessage.id));
            setMessageText(text);
        } finally {
            setIsSending(false);
        }
    };

    // Handle file selection (supports multiple)
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newFiles: { file: File; preview: string | null }[] = [];
        let hasError = false;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Check file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                setFileSizeError(`"${file.name}" exceeds 10 MB limit. Please choose smaller files.`);
                hasError = true;
                break;
            }

            newFiles.push({ file, preview: null });
        }

        if (hasError) {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setFileSizeError(null);

        // If multiple files selected, disable view-once
        if (newFiles.length > 1) {
            setSendAsViewOnce(false);
        }

        // Create previews for images
        newFiles.forEach((item, index) => {
            if (item.file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setSelectedFiles(prev => {
                        const updated = [...prev];
                        if (updated[index]) {
                            updated[index] = { ...updated[index], preview: e.target?.result as string };
                        }
                        return updated;
                    });
                };
                reader.readAsDataURL(item.file);
            }
        });

        setSelectedFiles(newFiles);
    };

    // Handle file upload and send
    const handleFileSend = async () => {
        if (selectedFiles.length === 0 || !tokens?.accessToken) return;

        setUploadingFile(true);
        setIsSending(true);

        try {
            // Upload all files
            const uploadedUrls: string[] = [];

            for (const item of selectedFiles) {
                const formData = new FormData();
                formData.append('file', item.file);

                const uploadRes = await fetch(
                    `${API_URL}/api/upload/chat/${conversationId}`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${tokens.accessToken}`,
                        },
                        body: formData,
                    }
                );

                if (!uploadRes.ok) {
                    throw new Error('Failed to upload file');
                }

                const uploadData = await uploadRes.json();
                uploadedUrls.push(uploadData.data.url);
            }

            // Send message with media URLs (first URL as main, others as additional)
            const res = await fetch(
                `${API_URL}/api/conversations/${conversationId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${tokens.accessToken}`,
                    },
                    body: JSON.stringify({
                        type: 'IMAGE',
                        content: messageText.trim() || null,
                        mediaUrl: uploadedUrls[0],
                        additionalMediaUrls: uploadedUrls.slice(1),
                        isViewOnce: selectedFiles.length === 1 ? sendAsViewOnce : false,
                    }),
                }
            );

            if (!res.ok) {
                throw new Error('Failed to send message');
            }

            // Clear files and message
            setSelectedFiles([]);
            setMessageText('');
            setSendAsViewOnce(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error sending files:', error);
            alert('Failed to send files. Please try again.');
        } finally {
            setUploadingFile(false);
            setIsSending(false);
        }
    };

    // Cancel all file selection
    const handleCancelFile = () => {
        setSelectedFiles([]);
        setSendAsViewOnce(false);
        setFileSizeError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Remove a single file from selection
    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        if (selectedFiles.length <= 2) {
            // If going from multiple to single, keep view-once option available
        }
    };

    // Delete message
    const handleDeleteMessage = async (forEveryone: boolean) => {
        try {
            const res = await fetch(
                `${API_URL}/api/conversations/${conversationId}/messages/${selectedMessage}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${tokens.accessToken}`,
                    },
                    body: JSON.stringify({ forEveryone }),
                }
            );

            if (res.ok) {
                if (forEveryone) {
                    // Will be handled by socket event
                    setMessages((prev) => prev.map(m =>
                        m.id === selectedMessage
                            ? { ...m, content: null, deletedAt: new Date().toISOString() }
                            : m
                    ));
                } else {
                    // Delete for me - just remove from local state
                    setMessages((prev) => prev.filter(m => m.id !== selectedMessage));
                }
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        } finally {
            setSelectedMessage(null);
            setShowDeleteMenu(false);
        }
    };

    // Load more messages
    const loadMoreMessages = async () => {
        if (!hasMore || !nextCursor || !tokens?.accessToken) return;

        try {
            const res = await fetch(
                `${API_URL}/api/conversations/${conversationId}/messages?cursor=${nextCursor}&limit=30`,
                { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
            );
            const data = await res.json();
            if (data.success) {
                setMessages((prev) => [...data.data.items.reverse(), ...prev]);
                setHasMore(data.data.hasMore);
                setNextCursor(data.data.nextCursor);
            }
        } catch (error) {
            console.error('Error loading more messages:', error);
        }
    };

    // Long press / right click handler for message
    const handleMessagePress = (messageId: string) => {
        setSelectedMessage(messageId);
        setShowDeleteMenu(true);
    };

    if (isLoading || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner size="lg" />
            </div>
        );
    }

    const selectedMessageData = messages.find(m => m.id === selectedMessage);
    const isOwnMessage = selectedMessageData?.sender.id === user?.id;

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header */}
            <header className="flex items-center gap-3 px-2 py-2 border-b bg-card/50 backdrop-blur-lg sticky top-0 z-10">
                <Link
                    href="/chats"
                    className="p-2 rounded-xl hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <button
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                >
                    <Avatar
                        src={participant?.photoUrl}
                        alt={participant?.displayName}
                        fallback={participant?.displayName || participant?.username}
                        size="default"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                            {participant?.displayName || participant?.username || 'Unknown'}
                        </p>
                        {isTyping && (
                            <p className="text-xs text-primary animate-pulse">typing...</p>
                        )}
                        {!isConnected && !isTyping && (
                            <p className="text-xs text-yellow-500">reconnecting...</p>
                        )}
                    </div>
                </button>
                <button className="p-2 rounded-xl hover:bg-muted transition-colors">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-2xl mx-auto space-y-4">
                    {hasMore && (
                        <button
                            onClick={loadMoreMessages}
                            className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
                        >
                            Load older messages
                        </button>
                    )}

                    {messages.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No messages yet</p>
                            <p className="text-sm">Send a message to start the conversation</p>
                        </div>
                    )}

                    {messages.map((message, index) => {
                        const isOwn = message.sender.id === user?.id;
                        const showAvatar = !isOwn &&
                            (index === 0 || messages[index - 1]?.sender.id !== message.sender.id);
                        const isDeleted = !!message.deletedAt;

                        return (
                            <div
                                key={message.id}
                                className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                                {!isOwn && (
                                    <div className="w-8 flex-shrink-0">
                                        {showAvatar && (
                                            <Avatar
                                                src={message.sender.photoUrl}
                                                alt={message.sender.displayName}
                                                fallback={message.sender.displayName || message.sender.username}
                                                size="sm"
                                            />
                                        )}
                                    </div>
                                )}
                                <div
                                    onClick={() => {
                                        // Don't show delete menu for view-once messages
                                        if (!message.isViewOnce) {
                                            handleMessagePress(message.id);
                                        }
                                    }}
                                    className={`max-w-[70%] px-4 py-2 rounded-2xl cursor-pointer select-none ${isOwn
                                        ? 'bg-primary text-primary-foreground rounded-br-md'
                                        : 'bg-muted rounded-bl-md'
                                        } ${selectedMessage === message.id ? 'ring-2 ring-primary/50' : ''}`}
                                >
                                    {isDeleted ? (
                                        <p className="text-sm italic opacity-60">
                                            {isOwn ? 'You deleted this message' : 'This message was deleted'}
                                        </p>
                                    ) : message.isViewOnce ? (
                                        // View-once message handling - use server-side viewedAt
                                        message.viewedAt ? (
                                            // Already viewed - show "Photo" text for both sender and recipient
                                            <div className="flex items-center gap-2">
                                                <Eye className="w-4 h-4 opacity-50" />
                                                <p className="text-sm italic opacity-60">Photo</p>
                                            </div>
                                        ) : isOwn ? (
                                            // Sender sees pending state until recipient views
                                            <div className="flex items-center gap-2 px-4 py-3">
                                                <div className="w-8 h-8 rounded-full border-2 border-current/50 flex items-center justify-center">
                                                    <Eye className="w-4 h-4 opacity-70" />
                                                </div>
                                                <span className="text-sm font-medium opacity-70">Photo</span>
                                            </div>
                                        ) : (
                                            // Recipient can tap to view
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setViewingOnceMessage(message.id);
                                                }}
                                                className="flex items-center gap-2 px-6 py-4"
                                            >
                                                <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center">
                                                    <Eye className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium">Photo</span>
                                            </button>
                                        )
                                    ) : (
                                        <>
                                            {/* Multiple image grid */}
                                            {message.type === 'IMAGE' && message.media.length > 0 && (
                                                <div
                                                    className={`grid gap-1 mb-1 cursor-pointer ${message.media.length === 1 ? 'grid-cols-1' :
                                                        message.media.length === 2 ? 'grid-cols-2' :
                                                            message.media.length === 3 ? 'grid-cols-2' :
                                                                'grid-cols-2'
                                                        }`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewingImages({
                                                            urls: message.media.map(m => m.url),
                                                            index: 0
                                                        });
                                                    }}
                                                >
                                                    {message.media.slice(0, 4).map((media, idx) => (
                                                        <div
                                                            key={media.id}
                                                            className={`relative overflow-hidden rounded-lg ${message.media.length === 1 ? '' :
                                                                message.media.length === 3 && idx === 0 ? 'row-span-2' : ''
                                                                }`}
                                                        >
                                                            <img
                                                                src={media.url}
                                                                alt={`Image ${idx + 1}`}
                                                                className={`w-full object-cover ${message.media.length === 1 ? 'max-h-80' :
                                                                    message.media.length === 3 && idx === 0 ? 'h-full min-h-[160px]' :
                                                                        'h-20'
                                                                    }`}
                                                            />
                                                            {/* Show more overlay */}
                                                            {idx === 3 && message.media.length > 4 && (
                                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                                    <span className="text-white font-bold text-lg">+{message.media.length - 4}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {message.content && (
                                                <p className="text-sm break-words">{message.content}</p>
                                            )}
                                        </>
                                    )}
                                    <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                        {formatMessageTime(message.createdAt)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Delete Menu Modal */}
            {showDeleteMenu && selectedMessage && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
                    onClick={() => {
                        setShowDeleteMenu(false);
                        setSelectedMessage(null);
                    }}
                >
                    <div
                        className="bg-card w-full max-w-md rounded-t-2xl p-4 space-y-2 animate-in slide-in-from-bottom"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">Delete Message</h3>
                            <button
                                onClick={() => {
                                    setShowDeleteMenu(false);
                                    setSelectedMessage(null);
                                }}
                                className="p-1 rounded-lg hover:bg-muted"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={() => handleDeleteMessage(false)}
                            className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-muted transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                            <div className="text-left">
                                <p className="font-medium">Delete for me</p>
                                <p className="text-sm text-muted-foreground">This message will be removed from your chat</p>
                            </div>
                        </button>

                        {isOwnMessage && (
                            <button
                                onClick={() => handleDeleteMessage(true)}
                                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                                <div className="text-left">
                                    <p className="font-medium">Delete for everyone</p>
                                    <p className="text-sm opacity-70">This message will be removed for all participants</p>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Input or Follow Warning */}
            <div className="p-4 border-t bg-card/50 backdrop-blur-lg">
                <div className="max-w-2xl mx-auto">
                    {followStatus && !followStatus.canMessage ? (
                        <div className="text-center py-3">
                            <p className="text-sm text-muted-foreground">
                                {!followStatus.iAmFollowing && !followStatus.theyAreFollowing ? (
                                    // Neither following
                                    <>You need to follow <span className="font-semibold">{participant?.displayName || participant?.username}</span> and they need to accept your request to message them.</>
                                ) : !followStatus.iAmFollowing && followStatus.theyAreFollowing ? (
                                    // They follow me but I don't follow them
                                    <>Follow <span className="font-semibold">{participant?.displayName || participant?.username}</span> back to continue messaging.</>
                                ) : followStatus.iAmFollowing && !followStatus.theyAreFollowing ? (
                                    // I follow them but they don't follow me
                                    followStatus.myRequestPending ? (
                                        <>Waiting for <span className="font-semibold">{participant?.displayName || participant?.username}</span> to accept your follow request.</>
                                    ) : (
                                        <><span className="font-semibold">{participant?.displayName || participant?.username}</span> needs to follow you back to continue messaging.</>
                                    )
                                ) : (
                                    <>You can&apos;t message this user right now.</>
                                )}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* File Size Error */}
                            {fileSizeError && (
                                <div className="mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                                    <div className="flex-1">
                                        <p className="text-sm text-red-500 font-medium">File too large</p>
                                        <p className="text-xs text-red-400">{fileSizeError}</p>
                                    </div>
                                    <button
                                        onClick={() => setFileSizeError(null)}
                                        className="p-1 rounded hover:bg-red-500/20 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            )}

                            {/* File Preview Grid */}
                            {selectedFiles.length > 0 && (
                                <div className="mb-2">
                                    {/* Grid for multiple files */}
                                    <div className={`grid gap-2 p-2 bg-muted rounded-lg ${selectedFiles.length === 1 ? 'grid-cols-1' :
                                        selectedFiles.length === 2 ? 'grid-cols-2' :
                                            selectedFiles.length === 3 ? 'grid-cols-3' :
                                                'grid-cols-4'
                                        }`}>
                                        {selectedFiles.map((item, index) => (
                                            <div key={index} className="relative group">
                                                {item.preview ? (
                                                    <img
                                                        src={item.preview}
                                                        alt={`Preview ${index + 1}`}
                                                        className={`w-full object-cover rounded ${selectedFiles.length === 1 ? 'h-40' : 'h-20'
                                                            }`}
                                                    />
                                                ) : (
                                                    <div className={`w-full bg-background border border-border rounded flex items-center justify-center ${selectedFiles.length === 1 ? 'h-40' : 'h-20'
                                                        }`}>
                                                        <Paperclip className="w-6 h-6 text-muted-foreground" />
                                                    </div>
                                                )}
                                                {/* Remove button */}
                                                <button
                                                    onClick={() => handleRemoveFile(index)}
                                                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* File info */}
                                    <div className="flex items-center justify-between mt-2 px-2">
                                        <p className="text-xs text-muted-foreground">
                                            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                                            ({(selectedFiles.reduce((acc, f) => acc + f.file.size, 0) / 1024 / 1024).toFixed(2)} MB)
                                        </p>
                                        <button
                                            onClick={handleCancelFile}
                                            className="text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            Clear all
                                        </button>
                                    </div>

                                    {/* View-once toggle - only for single image */}
                                    {selectedFiles.length === 1 && selectedFiles[0].file.type.startsWith('image/') && (
                                        <div className="flex items-center justify-between mt-2 px-2">
                                            <div className="flex items-center gap-2">
                                                <Eye className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">View once</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSendAsViewOnce(!sendAsViewOnce)}
                                                className={`relative w-10 h-5 rounded-full transition-colors ${sendAsViewOnce ? 'bg-primary' : 'bg-muted-foreground/30'
                                                    }`}
                                            >
                                                <span
                                                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${sendAsViewOnce ? 'translate-x-5' : ''
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*,application/pdf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    multiple
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 rounded-xl hover:bg-muted transition-colors"
                                >
                                    <Paperclip className="w-5 h-5 text-muted-foreground" />
                                </button>
                                <button
                                    type="button"
                                    className="p-2 rounded-xl hover:bg-muted transition-colors"
                                >
                                    <Smile className="w-5 h-5 text-muted-foreground" />
                                </button>
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => {
                                        setMessageText(e.target.value);
                                        handleTyping();
                                    }}
                                    placeholder={selectedFiles.length > 0 ? "Add a caption..." : "Message..."}
                                    className="flex-1 px-4 py-2 rounded-full bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <button
                                    type="submit"
                                    disabled={(!messageText.trim() && selectedFiles.length === 0) || isSending}
                                    className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {uploadingFile || isSending ? (
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>

            {/* Conversation Profile Modal */}
            <ConversationProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                conversationId={conversationId}
                participant={participant}
                tokens={tokens}
            />

            {/* View-once fullscreen popup */}
            {viewingOnceMessage && (() => {
                const msg = messages.find(m => m.id === viewingOnceMessage);
                if (!msg || !msg.media[0]) return null;

                const handleCloseViewOnce = async () => {
                    // Call API to mark as viewed
                    if (tokens?.accessToken) {
                        try {
                            const res = await fetch(
                                `${API_URL}/api/conversations/${conversationId}/messages/${viewingOnceMessage}/view`,
                                {
                                    method: 'POST',
                                    headers: {
                                        Authorization: `Bearer ${tokens.accessToken}`,
                                    },
                                }
                            );

                            if (res.ok) {
                                const data = await res.json();
                                // Update local message state with viewedAt
                                setMessages(prev => prev.map(m =>
                                    m.id === viewingOnceMessage
                                        ? { ...m, viewedAt: data.data.viewedAt || new Date().toISOString() }
                                        : m
                                ));
                            }
                        } catch (error) {
                            console.error('Error marking message as viewed:', error);
                        }
                    }
                    setViewingOnceMessage(null);
                };

                return (
                    <div
                        className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-200"
                        onClick={handleCloseViewOnce}
                    >
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white">
                            <div className="flex items-center gap-3">
                                <Avatar
                                    src={msg.sender.photoUrl}
                                    alt={msg.sender.displayName}
                                    fallback={msg.sender.displayName || msg.sender.username}
                                    size="sm"
                                />
                                <span className="font-medium">{msg.sender.displayName || msg.sender.username}</span>
                            </div>
                            <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <img
                            src={msg.media[0].url}
                            alt="View once photo"
                            className="max-w-full max-h-[80vh] object-contain"
                        />
                        <p className="absolute bottom-8 left-0 right-0 text-center text-white/70 text-sm">
                            Tap anywhere to close
                        </p>
                    </div>
                );
            })()}

            {/* Fullscreen image gallery viewer */}
            {viewingImages && (
                <div
                    className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-200"
                    onClick={() => setViewingImages(null)}
                >
                    {/* Close button */}
                    <button
                        className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full z-10"
                        onClick={() => setViewingImages(null)}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Image counter */}
                    {viewingImages.urls.length > 1 && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm">
                            {viewingImages.index + 1} / {viewingImages.urls.length}
                        </div>
                    )}

                    {/* Previous button */}
                    {viewingImages.urls.length > 1 && viewingImages.index > 0 && (
                        <button
                            className="absolute left-4 p-3 text-white hover:bg-white/10 rounded-full z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewingImages(prev => prev ? { ...prev, index: prev.index - 1 } : null);
                            }}
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    )}

                    {/* Image */}
                    <img
                        src={viewingImages.urls[viewingImages.index]}
                        alt={`Image ${viewingImages.index + 1}`}
                        className="max-w-full max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Next button */}
                    {viewingImages.urls.length > 1 && viewingImages.index < viewingImages.urls.length - 1 && (
                        <button
                            className="absolute right-4 p-3 text-white hover:bg-white/10 rounded-full z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewingImages(prev => prev ? { ...prev, index: prev.index + 1 } : null);
                            }}
                        >
                            <ArrowLeft className="w-6 h-6 rotate-180" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
