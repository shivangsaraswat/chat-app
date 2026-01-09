'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@chat-app/ui';
import { KeyRound, ArrowRight, ArrowLeft, Check, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Step = 'email' | 'pin' | 'success';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('email');

    // Form state
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendPin = async () => {
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send reset PIN');
            }

            setStep('pin');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, pin, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            setStep('success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50">
            <Card className="w-full max-w-md" padding="lg">
                {/* Step 1: Enter Email */}
                {step === 'email' && (
                    <>
                        <CardHeader className="text-center">
                            <Link
                                href="/login"
                                className="absolute left-4 top-4 p-2 rounded-lg hover:bg-muted"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <KeyRound className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Forgot password?</CardTitle>
                            <CardDescription>
                                Enter your email and we&apos;ll send you a reset PIN
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        inputSize="lg"
                                        required
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <p className="text-sm text-red-500 text-center">{error}</p>
                                )}

                                <Button
                                    type="button"
                                    size="lg"
                                    className="w-full"
                                    isLoading={isLoading}
                                    disabled={!email}
                                    onClick={handleSendPin}
                                >
                                    Send Reset PIN
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Remember your password?{' '}
                                    <Link href="/login" className="text-primary font-medium hover:underline">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </CardContent>
                    </>
                )}

                {/* Step 2: Enter PIN and New Password */}
                {step === 'pin' && (
                    <>
                        <CardHeader className="text-center">
                            <button
                                onClick={() => setStep('email')}
                                className="absolute left-4 top-4 p-2 rounded-lg hover:bg-muted"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <KeyRound className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Reset password</CardTitle>
                            <CardDescription>
                                Enter the PIN sent to {email}
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Reset PIN</label>
                                    <Input
                                        type="text"
                                        placeholder="Enter 6-digit PIN"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        inputSize="lg"
                                        className="text-center text-2xl tracking-widest"
                                        maxLength={6}
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">New Password</label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="At least 8 characters"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
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

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Confirm Password</label>
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Re-enter password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        inputSize="lg"
                                        required
                                    />
                                </div>

                                {error && (
                                    <p className="text-sm text-red-500 text-center">{error}</p>
                                )}

                                <Button
                                    type="button"
                                    size="lg"
                                    className="w-full"
                                    isLoading={isLoading}
                                    disabled={pin.length !== 6 || !newPassword || !confirmPassword}
                                    onClick={handleResetPassword}
                                >
                                    Reset Password
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </>
                )}

                {/* Step 3: Success */}
                {step === 'success' && (
                    <>
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-500" />
                            </div>
                            <CardTitle className="text-2xl">Password reset!</CardTitle>
                            <CardDescription>
                                Your password has been reset successfully
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <Button
                                type="button"
                                size="lg"
                                className="w-full"
                                onClick={() => router.replace('/login')}
                            >
                                Sign In
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    );
}
