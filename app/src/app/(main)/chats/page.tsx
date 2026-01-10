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
            <header className="flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-xl sticky top-0 z-40 border-b border-white/5">
                <h1 className="text-2xl font-bold tracking-tight">Chats</h1>
                <div className="flex items-center gap-3">
                    <Link
                        href="/explore"
                        className="p-2.5 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <Search className="w-5 h-5 text-zinc-400" />
                    </Link>
                    <Link
                        href="/explore"
                        className="p-2.5 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
                    >
                        <Plus className="w-5 h-5" />
                    </Link>
                </div>
            </header>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2">
                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center text-muted-foreground">
                        <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 shadow-inner">
                            <MessageCircle className="w-10 h-10 opacity-50" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2 text-foreground">No messages</h2>
                        <p className="mb-8 text-sm opacity-60">
                            Start connecting with your friends.
                        </p>
                        <Link
                            href="/explore"
                            className="px-8 py-3 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
                        >
                            Find people
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-1 py-2">
                        {conversations.map((conversation) => {
                            const hasUnread = (conversation.unreadCount || 0) > 0;

                            return (
                                <Link
                                    key={conversation.id}
                                    href={`/chats/${conversation.id}`}
                                    className={`group flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 ${hasUnread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-white/5'
                                        }`}
                                >
                                    <div className="relative shrink-0">
                                        <div className={`rounded-full p-0.5 ${hasUnread ? 'bg-gradient-to-tr from-yellow-400 to-primary' : ''}`}>
                                            <Avatar
                                                src={conversation.participant?.photoUrl}
                                                alt={conversation.participant?.displayName}
                                                fallback={conversation.participant?.displayName || conversation.participant?.username}
                                                className="w-14 h-14 border-2 border-background"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`truncate text-[15px] ${hasUnread ? 'font-bold text-foreground' : 'font-medium text-zinc-300'}`}>
                                                {conversation.participant?.displayName ||
                                                    conversation.participant?.username ||
                                                    'Unknown'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-[13px] truncate flex-1 leading-snug ${hasUnread ? 'text-white font-medium' : 'text-zinc-500'}`}>
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
                                                    : 'Active now'}
                                            </p>
                                            <span className="text-[12px] text-zinc-600 shrink-0">
                                                · {conversation.lastMessage ? formatMessageTime(conversation.lastMessage.createdAt) : ''}
                                            </span>
                                        </div>
                                    </div>
                                    {hasUnread && (
                                        <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
