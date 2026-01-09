'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Spinner } from '@chat-app/ui';
import { User, Mail, Lock, ArrowRight, ArrowLeft, Check, X, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Step = 'username' | 'details' | 'verify';

export default function SignupPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('username');

    // Form state
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [usernameError, setUsernameError] = useState('');
    const [error, setError] = useState('');

    // Debounced username check
    const checkUsername = useCallback(async (value: string) => {
        if (value.length < 3) {
            setUsernameAvailable(null);
            setUsernameError('Username must be at least 3 characters');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            setUsernameAvailable(false);
            setUsernameError('Only letters, numbers, and underscores');
            return;
        }

        setIsCheckingUsername(true);
        setUsernameError('');

        try {
            const res = await fetch(`${API_URL}/api/auth/check-username/${value}`);
            const data = await res.json();

            if (data.success) {
                setUsernameAvailable(data.data.available);
                setUsernameError(data.data.reason || '');
            }
        } catch {
            setUsernameError('Failed to check username');
        } finally {
            setIsCheckingUsername(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (username.length >= 3) {
                checkUsername(username);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username, checkUsername]);

    const handleUsernameNext = () => {
        if (usernameAvailable) {
            setStep('details');
        }
    };

    const handleDetailsNext = async () => {
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    displayName,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            // Store email for verification
            sessionStorage.setItem('pendingEmail', email);
            setStep('verify');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            // Store tokens
            localStorage.setItem('auth_tokens', JSON.stringify({
                accessToken: data.data.accessToken,
                refreshToken: data.data.refreshToken,
            }));
            localStorage.setItem('auth_user', JSON.stringify(data.data.user));

            // Clear pending email
            sessionStorage.removeItem('pendingEmail');

            // Redirect to profile
            router.replace('/profile');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setError('');
        setIsLoading(true);

        try {
            await fetch(`${API_URL}/api/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
        } catch {
            // Silent fail
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50">
            <Card className="w-full max-w-md" padding="lg">
                {/* Step 1: Choose Username */}
                {step === 'username' && (
                    <>
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <User className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Choose your username</CardTitle>
                            <CardDescription>
                                This will be your unique @handle
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                                        <Input
                                            type="text"
                                            placeholder="username"
                                            value={username}
                                            onChange={(e) => {
                                                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                                                setUsernameAvailable(null);
                                            }}
                                            inputSize="lg"
                                            className="pl-8 pr-10"
                                            autoFocus
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {isCheckingUsername && <Spinner size="sm" />}
                                            {!isCheckingUsername && usernameAvailable === true && (
                                                <Check className="w-5 h-5 text-green-500" />
                                            )}
                                            {!isCheckingUsername && usernameAvailable === false && (
                                                <X className="w-5 h-5 text-red-500" />
                                            )}
                                        </div>
                                    </div>
                                    {usernameError && (
                                        <p className="text-sm text-red-500">{usernameError}</p>
                                    )}
                                    {usernameAvailable && (
                                        <p className="text-sm text-green-500">Username is available!</p>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    size="lg"
                                    className="w-full"
                                    disabled={!usernameAvailable}
                                    onClick={handleUsernameNext}
                                >
                                    Next
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Already have an account?{' '}
                                    <Link href="/login" className="text-primary font-medium hover:underline">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </CardContent>
                    </>
                )}

                {/* Step 2: Enter Details */}
                {step === 'details' && (
                    <>
                        <CardHeader className="text-center">
                            <button
                                onClick={() => setStep('username')}
                                className="absolute left-4 top-4 p-2 rounded-lg hover:bg-muted"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Complete your profile</CardTitle>
                            <CardDescription>
                                @{username}
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Full Name</label>
                                    <Input
                                        type="text"
                                        placeholder="Your full name"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        inputSize="lg"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        inputSize="lg"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Password</label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="At least 8 characters"
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
                                    disabled={!displayName || !email || !password || !confirmPassword}
                                    onClick={handleDetailsNext}
                                >
                                    Sign Up
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </>
                )}

                {/* Step 3: Verify Email */}
                {step === 'verify' && (
                    <>
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Lock className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Verify your email</CardTitle>
                            <CardDescription>
                                We sent a 6-digit code to {email}
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="space-y-4">
                                <Input
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    inputSize="lg"
                                    className="text-center text-2xl tracking-widest"
                                    maxLength={6}
                                    autoFocus
                                />

                                {error && (
                                    <p className="text-sm text-red-500 text-center">{error}</p>
                                )}

                                <Button
                                    type="button"
                                    size="lg"
                                    className="w-full"
                                    isLoading={isLoading}
                                    disabled={otp.length !== 6}
                                    onClick={handleVerify}
                                >
                                    Verify
                                    <ArrowRight className="w-4 h-4" />
                                </Button>

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        className="text-sm text-primary hover:underline"
                                        disabled={isLoading}
                                    >
                                        Resend code
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    );
}
