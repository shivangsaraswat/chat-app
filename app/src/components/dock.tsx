'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Send, Compass, Bell, User } from 'lucide-react';
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
        { href: '/chats', icon: Send, label: 'Chats', badge: unreadChatCount },
        { href: '/explore', icon: Compass, label: 'Explore' },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[280px]">
            <nav className="flex items-center justify-between px-6 py-4 rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 ring-1 ring-white/5">
                {/* Left side - Notifications */}
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`relative flex items-center justify-center transition-all duration-300 ${isActive
                                ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]'
                                : 'text-muted-foreground hover:text-foreground hover:scale-105'
                                }`}
                        >
                            <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                            {item.badge && item.badge > 0 && (
                                <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-black" />
                            )}
                            {/* Active indicator dot */}
                            {isActive && (
                                <span className="absolute -bottom-3 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_currentColor]" />
                            )}
                        </Link>
                    );
                })}

                {/* Right side - Profile */}
                <Link
                    href="/profile"
                    className={`relative flex items-center justify-center transition-all duration-300 ${pathname === '/profile'
                        ? 'ring-2 ring-primary scale-105 rounded-full'
                        : 'hover:scale-105'
                        }`}
                >
                    {userPhoto ? (
                        <Avatar
                            src={userPhoto}
                            alt={user?.email}
                            fallback={user?.email}
                            className="w-7 h-7"
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                    )}
                </Link>
            </nav>
        </div>
    );
}
