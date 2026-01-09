'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, Spinner } from '@chat-app/ui';
import { ArrowLeft, Send, Paperclip, Smile, MoreVertical, Trash2, X } from 'lucide-react';
import { useAuth, useSocket } from '@/components/providers';
import { formatMessageTime } from '@chat-app/utils';

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
                    const exists = prev.some(m => m.id === data.message.id);
                    if (exists) return prev;
                    return [...prev, data.message];
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

        socket.on('message:new', handleNewMessage);
        socket.on('typing:start', handleTypingStart);
        socket.on('typing:stop', handleTypingStop);
        socket.on('message:deleted', handleMessageDeleted);

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('typing:start', handleTypingStart);
            socket.off('typing:stop', handleTypingStop);
            socket.off('message:deleted', handleMessageDeleted);
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
        if (!messageText.trim() || isSending || !tokens?.accessToken) return;

        const text = messageText.trim();
        setMessageText('');
        setIsSending(true);
        sendTypingStop(conversationId);

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
                setMessageText(text);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessageText(text);
        } finally {
            setIsSending(false);
        }
    };

    // Delete message
    const handleDeleteMessage = async (forEveryone: boolean) => {
        if (!selectedMessage || !tokens?.accessToken) return;

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
                <Link href={participant ? `/user/${participant.id}` : '#'} className="flex items-center gap-3 flex-1 min-w-0">
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
                </Link>
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
                                    onClick={() => handleMessagePress(message.id)}
                                    className={`max-w-[70%] px-4 py-2 rounded-2xl cursor-pointer select-none ${isOwn
                                        ? 'bg-primary text-primary-foreground rounded-br-md'
                                        : 'bg-muted rounded-bl-md'
                                        } ${selectedMessage === message.id ? 'ring-2 ring-primary/50' : ''}`}
                                >
                                    {isDeleted ? (
                                        <p className="text-sm italic opacity-60">
                                            {isOwn ? 'You deleted this message' : 'This message was deleted'}
                                        </p>
                                    ) : (
                                        <>
                                            {message.type === 'IMAGE' && message.media[0] && (
                                                <img
                                                    src={message.media[0].url}
                                                    alt="Image"
                                                    className="rounded-lg max-w-full mb-1"
                                                />
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

            {/* Input - no dock padding needed, dock is hidden in chat */}
            <div className="p-4 border-t bg-card/50 backdrop-blur-lg">
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <button
                            type="button"
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
                            placeholder="Message..."
                            className="flex-1 px-4 py-2 rounded-full bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                            type="submit"
                            disabled={!messageText.trim() || isSending}
                            className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isSending ? <Spinner size="sm" /> : <Send className="w-5 h-5" />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
