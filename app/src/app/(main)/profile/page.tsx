'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Card, Input, Spinner } from '@chat-app/ui';
import { LogOut, Moon, Sun, Monitor, Settings, Grid3X3, Bookmark, UserSquare2, X, Upload } from 'lucide-react';
import { useAuth, useTheme } from '@/components/providers';

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
    const { tokens, logout, isAuthenticated, isLoading: authLoading } = useAuth();
    const { theme, setTheme } = useTheme();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Edit form state
    const [editDisplayName, setEditDisplayName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editPhotoUrl, setEditPhotoUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (!tokens?.accessToken) return;

        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_URL}/api/users/me`, {
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
    }, [tokens?.accessToken]);

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    const openEditModal = () => {
        setEditDisplayName(profile?.profile?.displayName || '');
        setEditBio(profile?.profile?.bio || '');
        setEditPhotoUrl(profile?.profile?.photoUrl || '');
        setEditError('');
        setShowEditModal(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Convert to base64 for preview and storage
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditPhotoUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async () => {
        if (!tokens?.accessToken) return;

        setIsSaving(true);
        setEditError('');

        try {
            const res = await fetch(`${API_URL}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
                body: JSON.stringify({
                    displayName: editDisplayName,
                    bio: editBio,
                    photoUrl: editPhotoUrl || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }

            // Update local profile state
            setProfile(prev => prev ? {
                ...prev,
                profile: {
                    ...prev.profile,
                    displayName: editDisplayName,
                    bio: editBio,
                    photoUrl: editPhotoUrl,
                },
            } : null);

            setShowEditModal(false);
        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner size="lg" />
            </div>
        );
    }

    const themeOptions = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b bg-card/50 backdrop-blur-lg sticky top-0 z-10">
                <h1 className="text-xl font-semibold">{profile?.username || 'Profile'}</h1>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 rounded-lg hover:bg-muted"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </header>

            <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
                {/* Instagram-style Profile Header */}
                <div className="flex items-start gap-6 mb-4">
                    {/* Avatar - clickable to edit */}
                    <button onClick={openEditModal} className="relative group">
                        <Avatar
                            src={profile?.profile?.photoUrl}
                            alt={profile?.profile?.displayName}
                            fallback={profile?.profile?.displayName || profile?.username || profile?.email}
                            size="xl"
                        />
                        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="w-5 h-5 text-white" />
                        </div>
                    </button>

                    {/* Stats */}
                    <div className="flex-1 flex justify-around pt-2">
                        <div className="text-center">
                            <p className="text-xl font-semibold">0</p>
                            <p className="text-sm text-muted-foreground">Posts</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-semibold">{profile?.followersCount || 0}</p>
                            <p className="text-sm text-muted-foreground">Followers</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-semibold">{profile?.followingCount || 0}</p>
                            <p className="text-sm text-muted-foreground">Following</p>
                        </div>
                    </div>
                </div>

                {/* Name and bio */}
                <div className="mb-4">
                    <h2 className="font-semibold">
                        {profile?.profile?.displayName || profile?.username || 'User'}
                    </h2>
                    {profile?.profile?.bio && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {profile.profile.bio}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{profile?.email}</p>
                </div>

                {/* Edit profile button */}
                <Button variant="secondary" className="w-full mb-6" onClick={openEditModal}>
                    Edit Profile
                </Button>

                {/* Settings Panel (collapsible) */}
                {showSettings && (
                    <div className="space-y-4 mb-6">
                        {/* Theme Selection */}
                        <Card>
                            <div className="p-3 border-b">
                                <h3 className="font-medium text-sm">Appearance</h3>
                            </div>
                            <div className="p-1">
                                {themeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-sm ${theme === option.value
                                            ? 'bg-primary/10 text-primary'
                                            : 'hover:bg-muted'
                                            }`}
                                    >
                                        <option.icon className="w-4 h-4" />
                                        <span>{option.label}</span>
                                        {theme === option.value && (
                                            <span className="ml-auto text-primary">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </Card>

                        {/* Logout */}
                        <Card>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-500/10 transition-colors rounded-lg"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Log out</span>
                            </button>
                        </Card>
                    </div>
                )}

                {/* Tabs */}
                <div className="border-t">
                    <div className="flex">
                        <button className="flex-1 py-3 flex justify-center border-b-2 border-foreground">
                            <Grid3X3 className="w-5 h-5" />
                        </button>
                        <button className="flex-1 py-3 flex justify-center text-muted-foreground">
                            <Bookmark className="w-5 h-5" />
                        </button>
                        <button className="flex-1 py-3 flex justify-center text-muted-foreground">
                            <UserSquare2 className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Empty posts grid */}
                    <div className="flex justify-center py-12 text-muted-foreground">
                        <p className="text-sm">No posts yet</p>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {showEditModal && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowEditModal(false)}
                >
                    <div
                        className="bg-card w-full max-w-md rounded-2xl p-6 space-y-6 animate-in zoom-in-95"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Edit Profile</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="p-2 rounded-lg hover:bg-muted"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Profile Photo */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <Avatar
                                    src={editPhotoUrl}
                                    alt={editDisplayName}
                                    fallback={editDisplayName || profile?.username}
                                    size="xl"
                                />
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Change Photo
                            </Button>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Username</label>
                                <Input
                                    type="text"
                                    value={profile?.username || ''}
                                    disabled
                                    inputSize="lg"
                                    className="opacity-60 cursor-not-allowed"
                                />
                                <p className="text-xs text-muted-foreground">Username cannot be changed</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Display Name</label>
                                <Input
                                    type="text"
                                    value={editDisplayName}
                                    onChange={(e) => setEditDisplayName(e.target.value)}
                                    placeholder="Your display name"
                                    inputSize="lg"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bio</label>
                                <textarea
                                    value={editBio}
                                    onChange={(e) => setEditBio(e.target.value)}
                                    placeholder="Tell us about yourself"
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                    maxLength={150}
                                />
                                <p className="text-xs text-muted-foreground text-right">{editBio.length}/150</p>
                            </div>
                        </div>

                        {editError && (
                            <p className="text-sm text-red-500 text-center">{editError}</p>
                        )}

                        {/* Save Button */}
                        <Button
                            className="w-full"
                            size="lg"
                            isLoading={isSaving}
                            onClick={handleSaveProfile}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
