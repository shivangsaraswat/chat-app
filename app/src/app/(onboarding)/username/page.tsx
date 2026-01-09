'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@chat-app/ui';
import { AtSign, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function UsernamePage() {
    const router = useRouter();
    const { tokens, updateUser } = useAuth();
    const [username, setUsername] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const checkAvailability = async (value: string) => {
        if (value.length < 3) {
            setIsAvailable(null);
            return;
        }

        setIsChecking(true);
        try {
            const res = await fetch(
                `${API_URL}/api/users/username/check?username=${encodeURIComponent(value)}`,
                {
                    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
                }
            );
            const data = await res.json();
            setIsAvailable(data.data?.available ?? false);
        } catch {
            setIsAvailable(null);
        } finally {
            setIsChecking(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setUsername(value);
        setError('');
        setIsAvailable(null);

        // Debounced check
        const timeoutId = setTimeout(() => checkAvailability(value), 500);
        return () => clearTimeout(timeoutId);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAvailable) return;

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/users/username`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tokens?.accessToken}`,
                },
                body: JSON.stringify({ username }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to set username');
            }

            updateUser({ username: { id: '', userId: '', username, createdAt: new Date() } } as any);
            router.push('/profile-setup');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50">
            <Card className="w-full max-w-md" padding="lg">
                <CardHeader>
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <AtSign className="w-7 h-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Choose your username</CardTitle>
                    <CardDescription>
                        This is how others will find and mention you. You can't change this later.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="username"
                                value={username}
                                onChange={handleChange}
                                error={error}
                                inputSize="lg"
                                className="pl-8"
                                minLength={3}
                                maxLength={30}
                                required
                                autoFocus
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                                @
                            </span>

                            {/* Status indicator */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                {isChecking && (
                                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                                )}
                                {!isChecking && isAvailable === true && (
                                    <Check className="w-5 h-5 text-green-500" />
                                )}
                                {!isChecking && isAvailable === false && (
                                    <X className="w-5 h-5 text-destructive" />
                                )}
                            </div>
                        </div>

                        {username.length > 0 && username.length < 3 && (
                            <p className="text-sm text-muted-foreground">
                                Username must be at least 3 characters
                            </p>
                        )}

                        {!isChecking && isAvailable === false && (
                            <p className="text-sm text-destructive">
                                This username is already taken
                            </p>
                        )}

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            isLoading={isSubmitting}
                            disabled={!isAvailable || username.length < 3}
                        >
                            Continue
                        </Button>
                    </form>

                    {/* Step indicator */}
                    <div className="mt-8 flex justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div className="w-2 h-2 rounded-full bg-muted" />
                        <div className="w-2 h-2 rounded-full bg-muted" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
