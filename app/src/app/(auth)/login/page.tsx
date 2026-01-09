'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@chat-app/ui';
import { User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/components/providers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Save tokens and user data
            login({
                accessToken: data.data.accessToken,
                refreshToken: data.data.refreshToken,
            }, data.data.user);

            router.replace('/chats');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50">
            <Card className="w-full max-w-md" padding="lg">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Welcome back</CardTitle>
                    <CardDescription>
                        Sign in to your account to continue
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Username or Email</label>
                            <Input
                                type="text"
                                placeholder="Enter username or email"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                inputSize="lg"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    inputSize="lg"
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-red-500 text-center">{error}</p>
                        )}

                        <div className="flex justify-end">
                            <Link
                                href="/forgot-password"
                                className="text-sm text-primary hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            isLoading={isLoading}
                        >
                            Sign In
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Don&apos;t have an account?{' '}
                            <Link href="/signup" className="text-primary font-medium hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
