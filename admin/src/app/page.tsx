'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@chat-app/ui';
import { Shield, ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send OTP');
            }

            setStep('otp');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Invalid OTP');
            }

            // Check if user is admin
            if (!data.data.user.isAdmin) {
                throw new Error('Admin access required');
            }

            // Store tokens
            localStorage.setItem('admin_tokens', JSON.stringify({
                accessToken: data.data.accessToken,
                refreshToken: data.data.refreshToken,
            }));

            router.replace('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md" padding="lg">
                <CardHeader>
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Shield className="w-7 h-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Admin Portal</CardTitle>
                    <CardDescription>
                        {step === 'email'
                            ? 'Enter your admin email to continue'
                            : `Enter the code sent to ${email}`}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {step === 'email' ? (
                        <form onSubmit={handleRequestOtp} className="space-y-6">
                            <Input
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                error={error}
                                inputSize="lg"
                                required
                                autoFocus
                            />

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                isLoading={isLoading}
                            >
                                Continue
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <Input
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                error={error}
                                inputSize="lg"
                                maxLength={6}
                                required
                                autoFocus
                            />

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                isLoading={isLoading}
                                disabled={otp.length !== 6}
                            >
                                Verify
                            </Button>

                            <button
                                type="button"
                                onClick={() => setStep('email')}
                                className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
                            >
                                Use a different email
                            </button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
