'use client';

import { useState, useEffect } from 'react';
import { Avatar } from '@chat-app/ui';
import {
    X, User, Search, BellOff, MoreHorizontal,
    Palette, Timer, Shield, UserPlus, Users
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Participant {
    id: string;
    username?: string;
    displayName?: string;
    photoUrl?: string;
}

interface MediaItem {
    id: string;
    messageId: string;
    url: string;
    mimeType: string;
    createdAt: string;
}

interface ConversationProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    participant: Participant | null;
    tokens: { accessToken: string } | null;
}

export function ConversationProfileModal({
    isOpen,
    onClose,
    conversationId,
    participant,
    tokens,
}: ConversationProfileModalProps) {
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(false);

    useEffect(() => {
        if (!isOpen || !tokens?.accessToken) return;

        const fetchMedia = async () => {
            setLoadingMedia(true);
            try {
                const res = await fetch(
                    `${API_URL}/api/conversations/${conversationId}/media?limit=30`,
                    {
                        headers: { Authorization: `Bearer ${tokens.accessToken}` },
                    }
                );
                const data = await res.json();
                if (data.success) {
                    setMedia(data.data.items);
                }
            } catch (error) {
                console.error('Error fetching media:', error);
            } finally {
                setLoadingMedia(false);
            }
        };

        fetchMedia();
    }, [isOpen, conversationId, tokens?.accessToken]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="min-h-screen pb-20 max-w-2xl mx-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-lg border-b border-white/5">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-muted transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Profile Section */}
                <div className="flex flex-col items-center pt-8 pb-6 px-4">
                    <Avatar
                        src={participant?.photoUrl}
                        alt={participant?.displayName}
                        fallback={participant?.displayName || participant?.username}
                        className="w-24 h-24 border-2 border-white/10"
                    />
                    <h2 className="mt-4 text-xl font-bold flex items-center gap-2">
                        {participant?.displayName || participant?.username || 'Unknown'}
                    </h2>
                    {participant?.username && (
                        <p className="text-sm text-muted-foreground">@{participant.username}</p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-4 gap-4 px-6 py-4">
                    <Link
                        href={participant ? `/user/${participant.id}` : '#'}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-muted transition-colors"
                    >
                        <User className="w-6 h-6" />
                        <span className="text-xs">Profile</span>
                    </Link>
                    <button className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-muted transition-colors">
                        <Search className="w-6 h-6" />
                        <span className="text-xs">Search</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-muted transition-colors">
                        <BellOff className="w-6 h-6" />
                        <span className="text-xs">Mute</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-muted transition-colors">
                        <MoreHorizontal className="w-6 h-6" />
                        <span className="text-xs">Options</span>
                    </button>
                </div>

                {/* Settings List */}
                <div className="px-4 py-2 space-y-1">
                    <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Palette className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-medium">Theme</p>
                            <p className="text-sm text-muted-foreground">Default</p>
                        </div>
                    </button>

                    <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Timer className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-medium">Disappearing messages</p>
                            <p className="text-sm text-muted-foreground">Off</p>
                        </div>
                    </button>

                    <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-medium">Privacy & safety</p>
                        </div>
                    </button>

                    <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-medium">Nicknames</p>
                        </div>
                    </button>

                    <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-medium">Create a group chat</p>
                        </div>
                    </button>
                </div>

                {/* Shared Media */}
                {media.length > 0 && (
                    <div className="px-4 py-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Shared Media</h3>
                            <button className="text-sm text-primary hover:underline">
                                See all
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                            {media.slice(0, 9).map((item) => (
                                <div
                                    key={item.id}
                                    className="aspect-square rounded-lg overflow-hidden bg-muted"
                                >
                                    <img
                                        src={item.url}
                                        alt="Shared media"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {loadingMedia && (
                    <div className="px-4 py-6 text-center text-muted-foreground">
                        Loading media...
                    </div>
                )}

                {!loadingMedia && media.length === 0 && (
                    <div className="px-4 py-6 text-center text-muted-foreground">
                        No shared media yet
                    </div>
                )}
            </div>
        </div>
    );
}
