'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Card, Input, Spinner, Modal } from '@chat-app/ui';
import { LogOut, Moon, Sun, Monitor, Settings, Grid3X3, Bookmark, UserSquare2, X, Upload } from 'lucide-react';
import { useAuth, useTheme } from '@/components/providers';
import { SettingsModal } from '@/components/settings-modal';
import { UsersListModal } from '@/components/users-list-modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Profile {
    id: string;
    email: string;
    username?: string;
    profile?: {
        displayName?: string;
        bio?: string;
        photoUrl?: string;
        theme?: string;
    };
    followersCount?: number;
    followingCount?: number;
}

export default function ProfilePage() {
    const router = useRouter();
    const { logout, isAuthenticated, isLoading: authLoading } = useAuth();
    const { theme, setTheme } = useTheme();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Modals
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [usersModalTab, setUsersModalTab] = useState<'followers' | 'following'>('followers');
    const [showEditModal, setShowEditModal] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        displayName: '',
        bio: '',
        photoUrl: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            // Get tokens from localStorage (stored as JSON object)
            const storedTokens = localStorage.getItem('tokens');
            if (!storedTokens) {
                console.error('No tokens found in localStorage');
                setIsLoading(false);
                return;
            }

            const parsedTokens = JSON.parse(storedTokens);
            const token = parsedTokens.accessToken;

            console.log('Fetching profile with token:', token ? 'present' : 'missing');

            const res = await fetch(`${API_URL}/api/users/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            console.log('Profile API Response:', data);
            if (data.success) {
                setProfile(data.data);
                console.log('Profile set:', data.data);
            } else {
                console.error('Profile fetch failed:', data);
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    const openEditModal = () => {
        setEditForm({
            displayName: profile?.profile?.displayName || '',
            bio: profile?.profile?.bio || '',
            photoUrl: profile?.profile?.photoUrl || '',
        });
        setShowEditModal(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setEditForm((prev) => ({ ...prev, photoUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            // Get token from tokens object
            const storedTokens = localStorage.getItem('tokens');
            const token = storedTokens ? JSON.parse(storedTokens).accessToken : null;
            const res = await fetch(`${API_URL}/api/users/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(editForm),
            });
            const data = await res.json();
            if (data.success) {
                setProfile((prev) =>
                    prev
                        ? {
                            ...prev,
                            profile: { ...prev.profile, ...data.data },
                        }
                        : null
                );
                setShowEditModal(false);
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const openFollowers = () => {
        setUsersModalTab('followers');
        setShowUsersModal(true);
    };

    const openFollowing = () => {
        setUsersModalTab('following');
        setShowUsersModal(true);
    };

    if (authLoading || (!profile && isLoading)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-xl sticky top-0 z-40 border-b border-white/5">
                <h1 className="text-xl font-bold tracking-tight flex items-center gap-1">
                    @{profile?.username || 'username'}
                </h1>
                <button
                    onClick={() => setShowSettingsModal(true)}
                    className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <Settings className="w-6 h-6" />
                </button>
            </header>

            <div className="flex-1 w-full">
                <div className="px-6 pt-6 pb-2">
                    {/* Instagram-style Profile Header */}
                    <div className="flex items-center gap-8 mb-6">
                        {/* Avatar - clickable to edit */}
                        <button onClick={openEditModal} className="relative group shrink-0">
                            <div className="p-1 rounded-full border-2 border-white/10">
                                <Avatar
                                    src={profile?.profile?.photoUrl}
                                    alt={profile?.profile?.displayName}
                                    fallback={profile?.profile?.displayName || profile?.username || profile?.email}
                                    className="w-20 h-20"
                                />
                            </div>
                            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Upload className="w-6 h-6 text-white" />
                            </div>
                        </button>

                        {/* Stats */}
                        <div className="flex-1 flex justify-between pr-4">
                            <div className="text-center flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity">
                                <p className="text-lg font-bold">0</p>
                                <p className="text-xs text-muted-foreground">Posts</p>
                            </div>
                            <button
                                onClick={openFollowers}
                                className="text-center flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
                            >
                                <p className="text-lg font-bold">{profile?.followersCount || 0}</p>
                                <p className="text-xs text-muted-foreground">Followers</p>
                            </button>
                            <button
                                onClick={openFollowing}
                                className="text-center flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
                            >
                                <p className="text-lg font-bold">{profile?.followingCount || 0}</p>
                                <p className="text-xs text-muted-foreground">Following</p>
                            </button>
                        </div>
                    </div>

                    {/* Name and bio */}
                    <div className="mb-6 space-y-1">
                        <h2 className="font-bold text-lg">
                            {profile?.profile?.displayName || profile?.username || profile?.email?.split('@')[0] || 'Name'}
                        </h2>
                        {profile?.profile?.bio && (
                            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                {profile?.profile?.bio}
                            </p>
                        )}
                    </div>

                    {/* Edit profile button */}
                    <Button variant="outline" className="w-full mb-8 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 h-10 font-medium" onClick={openEditModal}>
                        Edit Profile
                    </Button>
                </div>

                {/* Tabs */}
                <div className="border-t border-white/5">
                    <div className="flex">
                        <button className="flex-1 py-3 flex justify-center border-b-2 border-white text-white">
                            <Grid3X3 className="w-6 h-6" />
                        </button>
                        <button className="flex-1 py-3 flex justify-center text-zinc-600 hover:text-zinc-400 transition-colors">
                            <Bookmark className="w-6 h-6" />
                        </button>
                        <button className="flex-1 py-3 flex justify-center text-zinc-600 hover:text-zinc-400 transition-colors">
                            <UserSquare2 className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Empty posts grid */}
                    <div className="grid grid-cols-3 gap-0.5 p-0.5">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="aspect-square bg-zinc-900/30 hover:bg-zinc-800/50 transition-colors flex items-center justify-center cursor-pointer">
                                {i === 1 && <p className="text-xs text-muted-foreground p-4 text-center">No posts yet</p>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Edit Profile Modal */}
                <Modal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    title="Edit Profile"
                >
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="relative group cursor-pointer">
                                <div className="rounded-full overflow-hidden border-2 border-white/10">
                                    <Avatar
                                        src={editForm.photoUrl}
                                        alt={editForm.displayName}
                                        fallback={editForm.displayName}
                                        className="w-24 h-24"
                                    />
                                </div>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                    <Upload className="w-6 h-6 text-white" />
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleImageUpload}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Display Name</label>
                                <Input
                                    value={editForm.displayName}
                                    onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                                    placeholder="Your name"
                                    className="bg-black/20 border-white/10"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bio</label>
                                <textarea
                                    className="w-full min-h-[100px] px-3 py-2 rounded-xl bg-black/20 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                                    value={editForm.bio}
                                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                    placeholder="Write something about yourself..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-semibold"
                            >
                                {isSaving ? <Spinner size="sm" className="text-white" /> : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Settings Modal */}
                <SettingsModal
                    isOpen={showSettingsModal}
                    onClose={() => setShowSettingsModal(false)}
                />

                {/* Users List Modal */}
                {profile && (
                    <UsersListModal
                        isOpen={showUsersModal}
                        onClose={() => setShowUsersModal(false)}
                        initialTab={usersModalTab}
                        userId={profile.id}
                    />
                )}
            </div>
        </div>
    );
}
