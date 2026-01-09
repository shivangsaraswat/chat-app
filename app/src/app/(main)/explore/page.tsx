'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input, Avatar, Spinner, Card } from '@chat-app/ui';
import { Search, UserPlus, Check, Clock, X } from 'lucide-react';
import { useAuth } from '@/components/providers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface User {
    id: string;
    username?: string;
    displayName?: string;
    photoUrl?: string;
}

interface FollowRequest {
    id: string;
    user: User;
    createdAt: string;
}

export default function ExplorePage() {
    const router = useRouter();
    const { tokens, isAuthenticated, isLoading: authLoading } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FollowRequest[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [loadingFollow, setLoadingFollow] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch pending requests
    useEffect(() => {
        if (!tokens?.accessToken) return;

        const fetchPendingRequests = async () => {
            try {
                const res = await fetch(`${API_URL}/api/follows/pending`, {
                    headers: { Authorization: `Bearer ${tokens.accessToken}` },
                });
                const data = await res.json();
                if (data.success) {
                    setPendingRequests(data.data);
                }
            } catch {
                // Handle error
            }
        };

        fetchPendingRequests();
    }, [tokens?.accessToken]);

    // Search users
    useEffect(() => {
        if (!tokens?.accessToken || searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const searchUsers = async () => {
            setIsSearching(true);
            try {
                const res = await fetch(
                    `${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=20`,
                    { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
                );
                const data = await res.json();
                if (data.success) {
                    setSearchResults(data.data);
                }
            } catch {
                // Handle error
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchUsers, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, tokens?.accessToken]);

    const handleFollow = async (userId: string) => {
        if (!tokens?.accessToken || loadingFollow) return;

        setLoadingFollow(userId);
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
                // Update UI to show pending status
                setSearchResults((prev) =>
                    prev.map((user) =>
                        user.id === userId ? { ...user, isPending: true } as any : user
                    )
                );
            }
        } catch {
            // Handle error
        } finally {
            setLoadingFollow(null);
        }
    };

    const handleRespondToRequest = async (requestId: string, accept: boolean) => {
        if (!tokens?.accessToken) return;

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
                // Remove from pending list
                setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
            }
        } catch {
            // Handle error
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Header */}
            <header className="px-4 py-3 border-b bg-card/50 backdrop-blur-lg sticky top-0 z-10">
                <h1 className="text-xl font-semibold mb-4">Explore</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by username or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
            </header>

            <div className="flex-1 p-4 space-y-6">
                {/* Pending Requests */}
                {pendingRequests.length > 0 && !searchQuery && (
                    <div>
                        <h2 className="text-sm font-medium text-muted-foreground mb-3">
                            Follow Requests ({pendingRequests.length})
                        </h2>
                        <div className="space-y-2">
                            {pendingRequests.map((request) => (
                                <Card key={request.id} padding="sm" className="flex items-center gap-3">
                                    <Avatar
                                        src={request.user.photoUrl}
                                        alt={request.user.displayName}
                                        fallback={request.user.displayName || request.user.username}
                                        size="default"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                            {request.user.displayName || request.user.username}
                                        </p>
                                        {request.user.username && request.user.displayName && (
                                            <p className="text-sm text-muted-foreground truncate">
                                                @{request.user.username}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRespondToRequest(request.id, true)}
                                            className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleRespondToRequest(request.id, false)}
                                            className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search Results */}
                {searchQuery && (
                    <div>
                        {isSearching ? (
                            <div className="flex justify-center py-8">
                                <Spinner />
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="space-y-2">
                                {searchResults.map((user) => (
                                    <Card
                                        key={user.id}
                                        padding="sm"
                                        className="flex items-center gap-3"
                                    >
                                        <Link href={`/user/${user.id}`}>
                                            <Avatar
                                                src={user.photoUrl}
                                                alt={user.displayName}
                                                fallback={user.displayName || user.username}
                                                size="default"
                                            />
                                        </Link>
                                        <Link href={`/user/${user.id}`} className="flex-1 min-w-0">
                                            <p className="font-medium truncate hover:underline">
                                                {user.displayName || user.username}
                                            </p>
                                            {user.username && user.displayName && (
                                                <p className="text-sm text-muted-foreground truncate">
                                                    @{user.username}
                                                </p>
                                            )}
                                        </Link>
                                        <button
                                            onClick={() => handleFollow(user.id)}
                                            disabled={loadingFollow === user.id || (user as any).isPending}
                                            className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                                        >
                                            {loadingFollow === user.id ? (
                                                <Spinner size="sm" />
                                            ) : (user as any).isPending ? (
                                                <>
                                                    <Clock className="w-4 h-4 inline mr-1" />
                                                    Pending
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="w-4 h-4 inline mr-1" />
                                                    Follow
                                                </>
                                            )}
                                        </button>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No users found for "{searchQuery}"
                            </div>
                        )}
                    </div>
                )}

                {/* Empty state */}
                {!searchQuery && pendingRequests.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Search for people to connect with</p>
                    </div>
                )}
            </div>
        </div>
    );
}
