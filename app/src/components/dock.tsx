'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Compass, Bell, User } from 'lucide-react';
import { Avatar } from '@chat-app/ui';
import { useAuth, useSocket } from '@/components/providers';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function Dock() {
    const pathname = usePathname();
    const { user, tokens } = useAuth();
    const { socket } = useSocket();
    const [notificationCount, setNotificationCount] = useState(0);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [userPhoto, setUserPhoto] = useState<string | null>(null);

    // Fetch pending follow requests count
    useEffect(() => {
        if (!tokens?.accessToken) return;

        const fetchNotificationCount = async () => {
            try {
                const res = await fetch(`${API_URL}/api/follows/pending`, {
                    headers: { Authorization: `Bearer ${tokens.accessToken}` },
                });
                const data = await res.json();
                if (data.success) {
                    setNotificationCount(data.data.length);
                }
            } catch {
                // Handle error silently
            }
        };

        fetchNotificationCount();
    }, [tokens?.accessToken]);

    // Fetch unread chat count
    useEffect(() => {
        if (!tokens?.accessToken) return;

        const fetchUnreadCount = async () => {
            try {
                const res = await fetch(`${API_URL}/api/conversations`, {
                    headers: { Authorization: `Bearer ${tokens.accessToken}` },
                });
                const data = await res.json();
                if (data.success) {
                    const total = data.data.items.reduce(
                        (sum: number, conv: { unreadCount?: number }) => sum + (conv.unreadCount || 0),
                        0
                    );
                    setUnreadChatCount(total);
                }
            } catch {
                // Handle error silently
            }
        };

        fetchUnreadCount();
    }, [tokens?.accessToken]);

    // Listen for new messages to update unread count
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (data: { conversationId: string; message: any }) => {
            // If message is from someone else, increment unread count
            const senderId = data.message.sender?.id || data.message.senderId;
            if (senderId !== user?.id) {
                setUnreadChatCount((prev) => prev + 1);
            }
        };

        socket.on('message:new', handleNewMessage);
        return () => {
            socket.off('message:new', handleNewMessage);
        };
    }, [socket, user?.id]);

    // Fetch user profile for avatar
    useEffect(() => {
        if (!tokens?.accessToken) return;

        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_URL}/api/users/me`, {
                    headers: { Authorization: `Bearer ${tokens.accessToken}` },
                });
                const data = await res.json();
                if (data.success && data.data.profile?.photoUrl) {
                    setUserPhoto(data.data.profile.photoUrl);
                }
            } catch {
                // Handle error silently
            }
        };

        fetchProfile();
    }, [tokens?.accessToken]);

    const navItems = [
        { href: '/notifications', icon: Bell, label: 'Notifications', badge: notificationCount },
        { href: '/chats', icon: MessageCircle, label: 'Chats', badge: unreadChatCount },
        { href: '/explore', icon: Compass, label: 'Explore' },
    ];

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
            <nav className="flex items-center gap-1 px-2 py-2 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg shadow-black/10">
                {/* Left side - Notifications */}
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${isActive
                                ? 'bg-primary text-primary-foreground scale-110 shadow-md'
                                : 'hover:bg-muted hover:scale-105'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.badge && item.badge > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium px-1">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                            {/* Active indicator dot */}
                            {isActive && (
                                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary-foreground" />
                            )}
                        </Link>
                    );
                })}

                {/* Divider */}
                <div className="w-px h-8 bg-border/50 mx-1" />

                {/* Right side - Profile */}
                <Link
                    href="/profile"
                    className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${pathname === '/profile'
                        ? 'ring-2 ring-primary scale-110'
                        : 'hover:scale-105'
                        }`}
                >
                    {userPhoto ? (
                        <Avatar
                            src={userPhoto}
                            alt={user?.email}
                            fallback={user?.email}
                            size="default"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                    )}
                    {pathname === '/profile' && (
                        <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
                    )}
                </Link>
            </nav>
        </div>
    );
}
