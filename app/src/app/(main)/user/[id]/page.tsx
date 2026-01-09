'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Avatar, Button, Card, Spinner } from '@chat-app/ui';
import { ArrowLeft, MessageCircle, UserPlus, Clock, UserCheck, UserMinus, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/components/providers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface UserProfile {
    id: string;
    username?: string;
    displayName?: string;
    bio?: string;
    photoUrl?: string;
    isConnected: boolean;
    followStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'received' | null;
    followersCount?: number;
    followingCount?: number;
}

export default function UserProfilePage() {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;
    const { tokens, user, isAuthenticated, isLoading: authLoading } = useAuth();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Redirect to own profile if viewing self
    useEffect(() => {
        if (user?.id === userId) {
            router.replace('/profile');
        }
    }, [user?.id, userId, router]);

    useEffect(() => {
        if (!tokens?.accessToken || !userId) return;

        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_URL}/api/users/${userId}`, {
                    headers: { Authorization: `Bearer ${tokens.accessToken}` },
                });
                const data = await res.json();
                if (data.success) {
                    setProfile(data.data);
                }
            } catch {
                // Handle error
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [tokens?.accessToken, userId]);

    const handleFollow = async () => {
        if (!tokens?.accessToken || actionLoading) return;

        setActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/follows`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
                body: JSON.stringify({ userId }),
            });

            if (res.ok) {
                setProfile((prev) => prev ? { ...prev, followStatus: 'PENDING', isConnected: false } : null);
            }
        } catch {
            // Handle error
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelRequest = async () => {
        if (!tokens?.accessToken || actionLoading) return;

        setActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/follows/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${tokens.accessToken}` },
            });

            if (res.ok) {
                setProfile((prev) => prev ? { ...prev, followStatus: null, isConnected: false } : null);
            }
        } catch {
            // Handle error
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnfollow = async () => {
        if (!tokens?.accessToken || actionLoading) return;

        setActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/follows/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${tokens.accessToken}` },
            });

            if (res.ok) {
                setProfile((prev) => prev ? { ...prev, followStatus: null, isConnected: false } : null);
            }
        } catch {
            // Handle error
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartChat = async () => {
        if (!tokens?.accessToken) return;

        setActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
                body: JSON.stringify({ userId }),
            });

            const data = await res.json();
            if (data.success && data.data.id) {
                router.push(`/chats/${data.data.id}`);
            }
        } catch {
            // Handle error
        } finally {
            setActionLoading(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <p className="text-muted-foreground mb-4">User not found</p>
                <Button onClick={() => router.back()}>Go back</Button>
            </div>
        );
    }

    // Determine action button state
    const renderActionButtons = () => {
        if (profile.isConnected) {
            // Connected - show Message and Following buttons
            return (
                <div className="flex gap-2 w-full">
                    <Button
                        onClick={handleStartChat}
                        className="flex-1"
                        disabled={actionLoading}
                    >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                    </Button>
                    <Button
                        onClick={handleUnfollow}
                        variant="secondary"
                        className="flex-1"
                        disabled={actionLoading}
                    >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Following
                    </Button>
                </div>
            );
        }

        if (profile.followStatus === 'PENDING') {
            // I sent a request, waiting for them to accept
            return (
                <Button
                    onClick={handleCancelRequest}
                    variant="secondary"
                    className="w-full"
                    disabled={actionLoading}
                >
                    {actionLoading ? (
                        <Spinner size="sm" />
                    ) : (
                        <>
                            <Clock className="w-4 h-4 mr-2" />
                            Requested • Cancel
                        </>
                    )}
                </Button>
            );
        }

        if (profile.followStatus === 'received') {
            // They sent me a request
            return (
                <Button
                    onClick={() => router.push('/notifications')}
                    className="w-full"
                >
                    View Follow Request
                </Button>
            );
        }

        // No connection - show Follow button
        return (
            <Button
                onClick={handleFollow}
                className="w-full"
                disabled={actionLoading}
            >
                {actionLoading ? (
                    <Spinner size="sm" />
                ) : (
                    <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Follow
                    </>
                )}
            </Button>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b bg-card/50 backdrop-blur-lg sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-muted">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-semibold">{profile.username || 'User'}</h1>
                    </div>
                </div>
                <button className="p-2 rounded-lg hover:bg-muted">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </header>

            {/* Instagram-style Profile */}
            <div className="p-4 max-w-2xl mx-auto w-full">
                {/* Top section - Avatar and stats */}
                <div className="flex items-start gap-6 mb-4">
                    {/* Avatar */}
                    <Avatar
                        src={profile.photoUrl}
                        alt={profile.displayName}
                        fallback={profile.displayName || profile.username}
                        size="xl"
                    />

                    {/* Stats */}
                    <div className="flex-1 flex justify-around pt-2">
                        <div className="text-center">
                            <p className="text-xl font-semibold">0</p>
                            <p className="text-sm text-muted-foreground">Posts</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-semibold">{profile.followersCount || 0}</p>
                            <p className="text-sm text-muted-foreground">Followers</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-semibold">{profile.followingCount || 0}</p>
                            <p className="text-sm text-muted-foreground">Following</p>
                        </div>
                    </div>
                </div>

                {/* Name and bio */}
                <div className="mb-4">
                    <h2 className="font-semibold">
                        {profile.displayName || profile.username || 'User'}
                    </h2>
                    {profile.bio && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {profile.bio}
                        </p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="mb-6">
                    {renderActionButtons()}
                </div>

                {/* Tabs placeholder */}
                <div className="border-t">
                    <div className="flex justify-center py-12 text-muted-foreground">
                        <p className="text-sm">No posts yet</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
