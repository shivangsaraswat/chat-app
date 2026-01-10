'use client';

import { useState } from 'react';
import { useTheme } from '@/components/providers';
import { useAuth } from '@/components/providers';
import { Monitor, Moon, Sun, LogOut, Lock, ChevronRight, X, Loader2 } from 'lucide-react';
import { Button, Input, Modal, Spinner } from '@chat-app/ui';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { theme, setTheme } = useTheme();
    const { logout, user } = useAuth();
    const [view, setView] = useState<'main' | 'password' | 'theme'>('main');
    const [isLoading, setIsLoading] = useState(false);

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await logout();
            onClose();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords don't match");
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);

        try {
            const storedTokens = localStorage.getItem('tokens');
            const token = storedTokens ? JSON.parse(storedTokens).accessToken : null;
            const res = await fetch(`${API_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to change password');
            }

            setPasswordSuccess('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            // Wait a bit then go back to main
            setTimeout(() => {
                setView('main');
                setPasswordSuccess('');
            }, 1500);

        } catch (error: any) {
            setPasswordError(error.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-zinc-900 sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 relative">
                    {view !== 'main' && (
                        <button
                            onClick={() => {
                                setView('main');
                                setPasswordError('');
                                setPasswordSuccess('');
                            }}
                            className="absolute left-4 p-1 hover:bg-white/5 rounded-full"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                    )}

                    <h2 className="text-base font-semibold w-full text-center">
                        {view === 'main' && 'Settings'}
                        {view === 'password' && 'Password'}
                        {view === 'theme' && 'Appearance'}
                    </h2>

                    <button onClick={onClose} className="absolute right-4 p-1 hover:bg-white/5 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 min-h-[300px]">
                    {view === 'main' && (
                        <div className="space-y-4">
                            {/* Account Section */}
                            <div className="space-y-1">
                                <h3 className="text-xs font-medium text-muted-foreground ml-2 mb-1 uppercase tracking-wider">Account</h3>
                                <button
                                    onClick={() => setView('password')}
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Lock className="w-5 h-5 text-white" />
                                        <div className="text-left">
                                            <p className="text-sm font-medium">Password and security</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>

                            {/* App Section */}
                            <div className="space-y-1">
                                <h3 className="text-xs font-medium text-muted-foreground ml-2 mb-1 uppercase tracking-wider">App</h3>
                                <button
                                    onClick={() => setView('theme')}
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Monitor className="w-5 h-5 text-white" />
                                        <div className="text-left">
                                            <p className="text-sm font-medium">Appearance</p>
                                            <p className="text-xs text-muted-foreground capitalize">{theme} mode</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="pt-4">
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left p-4 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors font-medium flex items-center gap-3"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Log out {user?.username && <span className="text-xs font-normal opacity-70">@{typeof user.username === 'object' ? (user.username as any).username : user.username}</span>}
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'password' && (
                        <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                            <p className="text-sm text-zinc-400 mb-4 px-1">
                                Your password must be at least 8 characters long.
                            </p>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        type="password"
                                        placeholder="Current password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="bg-black/20 border-white/10 focus:border-white/20 h-12 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        type="password"
                                        placeholder="New password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="bg-black/20 border-white/10 focus:border-white/20 h-12 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        type="password"
                                        placeholder="Re-type new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="bg-black/20 border-white/10 focus:border-white/20 h-12 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            {passwordError && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {passwordError}
                                </div>
                            )}

                            {passwordSuccess && (
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                                    {passwordSuccess}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-12 rounded-xl bg-primary text-white font-semibold mt-4"
                                disabled={isLoading}
                            >
                                {isLoading ? <Spinner size="sm" className="text-white" /> : 'Change Password'}
                            </Button>
                        </form>
                    )}

                    {view === 'theme' && (
                        <div className="space-y-2 pt-2">
                            {[
                                { value: 'light', label: 'Light', icon: Sun },
                                { value: 'dark', label: 'Dark', icon: Moon },
                                { value: 'system', label: 'System', icon: Monitor },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setTheme(option.value as any)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${theme === option.value
                                        ? 'bg-primary/10 border border-primary/20 text-primary'
                                        : 'bg-white/5 border border-transparent hover:bg-white/10 text-zinc-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <option.icon className="w-5 h-5" />
                                        <span className="font-medium text-sm">{option.label}</span>
                                    </div>
                                    {theme === option.value && (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
