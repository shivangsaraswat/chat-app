'use client';

import { useState, useEffect } from 'react';
import { Avatar, Spinner } from '@chat-app/ui';
import { X, Search } from 'lucide-react';
import Link from 'next/link';

interface User {
    id: string;
    username: string;
    displayName: string;
    photoUrl?: string;
    isFollowing?: boolean;
}

interface UsersListModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab: 'followers' | 'following';
    userId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function UsersListModal({ isOpen, onClose, initialTab, userId }: UsersListModalProps) {
    const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchUsers = async () => {
            setLoading(true);
            try {
                const storedTokens = localStorage.getItem('tokens');
                const token = storedTokens ? JSON.parse(storedTokens).accessToken : null;
                const endpoint = activeTab === 'followers' ? 'followers' : 'following';
                const res = await fetch(`${API_URL}/api/follows/${userId}/${endpoint}?limit=50`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await res.json();
                if (data.success) {
                    setUsers(data.data.items);
                }
            } catch (error) {
                console.error(`Failed to fetch ${activeTab}:`, error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [activeTab, userId, isOpen]);

    const filteredUsers = users.filter(user =>
        (user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
        (user.username?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-[400px] h-[70vh] max-h-[600px] bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-4 pt-3 pb-0 border-b border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-8" /> {/* Spacer */}
                        <h2 className="text-base font-bold text-center">
                            {users.length > 0 ? users[0]?.username : 'Users'}
                        </h2>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-full">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex w-full">
                        <button
                            onClick={() => setActiveTab('followers')}
                            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'followers'
                                ? 'border-white text-white'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Followers
                        </button>
                        <button
                            onClick={() => setActiveTab('following')}
                            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'following'
                                ? 'border-white text-white'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Following
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-white/20 placeholder:text-zinc-600"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Spinner size="default" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-800 flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-zinc-700" />
                            </div>
                            <p className="text-lg font-bold">No results found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {searchQuery ? `No users found matching "${searchQuery}"` : activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredUsers.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Link href={`/user/${user.id}`} onClick={onClose}>
                                            <Avatar
                                                src={user.photoUrl}
                                                alt={user.displayName}
                                                fallback={user.displayName}
                                                className="w-11 h-11 border border-white/5"
                                            />
                                        </Link>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1">
                                                <Link href={`/user/${user.id}`} onClick={onClose} className="font-semibold text-sm truncate hover:underline">
                                                    {user.username}
                                                </Link>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {user.displayName}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Button - For now just a placeholder or "Remove" if viewing own followers */}
                                    <button className="px-4 py-1.5 rounded-lg bg-white/10 text-sm font-semibold hover:bg-white/20 transition-colors">
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
