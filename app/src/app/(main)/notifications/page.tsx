'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Avatar, Spinner } from '@chat-app/ui';
import { Bell, Check, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/providers';
import { formatRelativeTime } from '@chat-app/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FollowRequest {
    id: string;
    user: {
        id: string;
        username?: string;
        displayName?: string;
        photoUrl?: string;
    };
    createdAt: string;
}

export default function NotificationsPage() {
    const router = useRouter();
    const { tokens, isAuthenticated, isLoading: authLoading } = useAuth();
    const [requests, setRequests] = useState<FollowRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [respondingTo, setRespondingTo] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (!tokens?.accessToken) return;

        const fetchRequests = async () => {
            try {
                const res = await fetch(`${API_URL}/api/follows/pending`, {
                    headers: { Authorization: `Bearer ${tokens.accessToken}` },
                });
                const data = await res.json();
                if (data.success) {
                    setRequests(data.data);
                }
            } catch {
                // Handle error
            } finally {
                setIsLoading(false);
            }
        };

        fetchRequests();
    }, [tokens?.accessToken]);

    const handleRespond = async (requestId: string, accept: boolean) => {
        if (!tokens?.accessToken || respondingTo) return;

        setRespondingTo(requestId);
        try {
            const res = await fetch(`${API_URL}/api/follows/${requestId}/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
                body: JSON.stringify({ accept }),
            });

            if (res.ok) {
                setRequests((prev) => prev.filter((r) => r.id !== requestId));
            }
        } catch {
            // Handle error
        } finally {
            setRespondingTo(null);
        }
    };

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
            <header className="flex items-center gap-4 px-6 py-4 bg-background/80 backdrop-blur-xl sticky top-0 z-40 border-b border-white/5">
                <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
            </header>

            <div className="flex-1 px-4 py-2 w-full">
                {requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-muted-foreground">
                        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                            <Bell className="w-8 h-8 opacity-50" />
                        </div>
                        <h2 className="text-lg font-medium mb-1 text-foreground">No notifications</h2>
                        <p className="text-sm opacity-60">
                            When someone sends you a follow request, it will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">
                            Follow Requests ({requests.length})
                        </h2>
                        {requests.map((request) => (
                            <div key={request.id} className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/50 border border-white/5">
                                <Link href={`/user/${request.user.id}`} className="shrink-0">
                                    <Avatar
                                        src={request.user.photoUrl}
                                        alt={request.user.displayName}
                                        fallback={request.user.displayName || request.user.username}
                                        className="w-12 h-12 border border-black/50"
                                    />
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link href={`/user/${request.user.id}`} className="hover:underline decoration-white/50">
                                        <p className="font-semibold text-sm truncate">
                                            {request.user.displayName || request.user.username}
                                        </p>
                                    </Link>
                                    {request.user.username && request.user.displayName && (
                                        <p className="text-xs text-muted-foreground truncate">
                                            @{request.user.username}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {formatRelativeTime(request.createdAt)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRespond(request.id, true)}
                                        disabled={respondingTo === request.id}
                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-all shadow-[0_0_10px_rgba(var(--primary),0.4)] disabled:opacity-50"
                                    >
                                        {respondingTo === request.id ? (
                                            <Spinner size="sm" />
                                        ) : (
                                            <Check className="w-5 h-5" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleRespond(request.id, false)}
                                        disabled={respondingTo === request.id}
                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
