'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Spinner } from '@chat-app/ui';
import { MessageCircle, Search, Plus } from 'lucide-react';
import { useAuth, useSocket } from '@/components/providers';
import { formatMessageTime } from '@chat-app/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Conversation {
    id: string;
    participant: {
        id: string;
        username?: string;
        displayName?: string;
        photoUrl?: string;
    } | null;
    lastMessage: {
        id: string;
        type: string;
        content: string | null;
        senderId: string;
        createdAt: string;
    } | null;
    unreadCount: number;
    updatedAt: string;
}

export default function ChatsPage() {
    const router = useRouter();
    const { tokens, user, isAuthenticated, isLoading: authLoading } = useAuth();
    const { socket, isConnected } = useSocket();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch conversations
    const fetchConversations = async () => {
        if (!tokens?.accessToken) return;

        try {
            const res = await fetch(`${API_URL}/api/conversations`, {
                headers: { Authorization: `Bearer ${tokens.accessToken}` },
            });
            const data = await res.json();
            if (data.success) {
                setConversations(data.data.items);
            }
        } catch {
            // Handle error
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, [tokens?.accessToken]);

    // Listen for new messages to update conversation list in real-time
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (data: { conversationId: string; message: any }) => {
            console.log('📩 Chats list - new message:', data);
            setConversations((prev) => {
                const existing = prev.find((c) => c.id === data.conversationId);
                if (existing) {
                    // Is this message from someone else?
                    const isFromOther = data.message.sender?.id !== user?.id && data.message.senderId !== user?.id;
                    // Move to top and update last message + increment unread
                    return [
                        {
                            ...existing,
                            lastMessage: {
                                id: data.message.id,
                                type: data.message.type,
                                content: data.message.content,
                                senderId: data.message.sender?.id || data.message.senderId,
                                createdAt: typeof data.message.createdAt === 'string'
                                    ? data.message.createdAt
                                    : new Date(data.message.createdAt).toISOString(),
                            },
                            unreadCount: isFromOther ? (existing.unreadCount || 0) + 1 : existing.unreadCount,
                            updatedAt: new Date().toISOString(),
                        },
                        ...prev.filter((c) => c.id !== data.conversationId),
                    ];
                }
                // If conversation doesn't exist, refresh the list
                fetchConversations();
                return prev;
            });
        };

        socket.on('message:new', handleNewMessage);
        return () => {
            socket.off('message:new', handleNewMessage);
        };
    }, [socket, user?.id]);

    // Calculate total unread for export to dock
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background pb-24">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b bg-card/50 backdrop-blur-lg sticky top-0 z-10">
                <h1 className="text-xl font-semibold">Chats</h1>
                <div className="flex items-center gap-2">
                    <Link
                        href="/explore"
                        className="p-2 rounded-xl hover:bg-muted transition-colors"
                    >
                        <Search className="w-5 h-5" />
                    </Link>
                    <Link
                        href="/explore"
                        className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </Link>
                </div>
            </header>

            {/* Conversation List with max-width */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                    {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <MessageCircle className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h2 className="text-lg font-medium mb-2">No conversations yet</h2>
                            <p className="text-muted-foreground mb-6">
                                Connect with people to start chatting
                            </p>
                            <Link
                                href="/explore"
                                className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                            >
                                Find people
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {conversations.map((conversation) => {
                                const hasUnread = (conversation.unreadCount || 0) > 0;

                                return (
                                    <Link
                                        key={conversation.id}
                                        href={`/chats/${conversation.id}`}
                                        className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="relative">
                                            <Avatar
                                                src={conversation.participant?.photoUrl}
                                                alt={conversation.participant?.displayName}
                                                fallback={conversation.participant?.displayName || conversation.participant?.username}
                                                size="lg"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`truncate ${hasUnread ? 'font-bold' : 'font-medium'}`}>
                                                    {conversation.participant?.displayName ||
                                                        conversation.participant?.username ||
                                                        'Unknown'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {conversation.lastMessage && (
                                                        <span className={`text-xs ${hasUnread ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                                            {formatMessageTime(conversation.lastMessage.createdAt)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className={`text-sm truncate flex-1 ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                    {conversation.lastMessage
                                                        ? conversation.lastMessage.type === 'TEXT'
                                                            ? conversation.lastMessage.senderId === user?.id
                                                                ? `You: ${conversation.lastMessage.content}`
                                                                : conversation.lastMessage.content
                                                            : conversation.lastMessage.type === 'IMAGE'
                                                                ? '📷 Photo'
                                                                : conversation.lastMessage.type === 'FILE'
                                                                    ? '📎 File'
                                                                    : 'Message'
                                                        : 'Start a conversation'}
                                                </p>
                                                {hasUnread && (
                                                    <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                                                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
