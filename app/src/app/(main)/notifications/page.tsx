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
        <div className="flex flex-col min-h-screen bg-background">
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-3 border-b bg-card/50 backdrop-blur-lg sticky top-0 z-10">
                <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-semibold">Notifications</h1>
            </header>

            <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
                {requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Bell className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-lg font-medium mb-2">No notifications</h2>
                        <p className="text-muted-foreground">
                            When someone sends you a follow request, it will appear here
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <h2 className="text-sm font-medium text-muted-foreground mb-3">
                            Follow Requests ({requests.length})
                        </h2>
                        {requests.map((request) => (
                            <Card key={request.id} className="p-4">
                                <div className="flex items-center gap-3">
                                    <Link href={`/user/${request.user.id}`}>
                                        <Avatar
                                            src={request.user.photoUrl}
                                            alt={request.user.displayName}
                                            fallback={request.user.displayName || request.user.username}
                                            size="lg"
                                        />
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/user/${request.user.id}`} className="hover:underline">
                                            <p className="font-medium truncate">
                                                {request.user.displayName || request.user.username}
                                            </p>
                                        </Link>
                                        {request.user.username && request.user.displayName && (
                                            <p className="text-sm text-muted-foreground truncate">
                                                @{request.user.username}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatRelativeTime(request.createdAt)}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRespond(request.id, true)}
                                            disabled={respondingTo === request.id}
                                            className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {respondingTo === request.id ? (
                                                <Spinner size="sm" />
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4" />
                                                    Accept
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleRespond(request.id, false)}
                                            disabled={respondingTo === request.id}
                                            className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
