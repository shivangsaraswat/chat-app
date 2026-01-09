'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Avatar } from '@chat-app/ui';
import { User, Camera } from 'lucide-react';
import { useAuth } from '@/components/providers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ProfileSetupPage() {
    const router = useRouter();
    const { tokens, updateUser } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('Image must be less than 10MB');
            return;
        }

        setIsUploading(true);
        setError('');

        try {
            // Convert to base64 for preview
            const reader = new FileReader();
            reader.onload = (event) => {
                setPhotoUrl(event.target?.result as string);
            };
            reader.readAsDataURL(file);

            // TODO: Upload to ImageKit via backend
            // For now, we'll use the base64 preview
        } catch {
            setError('Failed to upload photo');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/users/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tokens?.accessToken}`,
                },
                body: JSON.stringify({
                    displayName,
                    bio: bio || undefined,
                    photoUrl: photoUrl || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to set profile');
            }

            updateUser({
                profile: {
                    id: '',
                    userId: '',
                    displayName,
                    bio,
                    photoUrl,
                    theme: 'SYSTEM',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            } as any);

            router.push('/theme-preference');
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
                        <User className="w-7 h-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Set up your profile</CardTitle>
                    <CardDescription>
                        Add a photo and tell people a bit about yourself
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Photo Upload */}
                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={handlePhotoClick}
                                className="relative group"
                                disabled={isUploading}
                            >
                                <Avatar
                                    src={photoUrl}
                                    alt={displayName}
                                    fallback={displayName || 'U'}
                                    size="2xl"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-6 h-6 text-white" />
                                </div>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="hidden"
                            />
                        </div>

                        <Input
                            type="text"
                            label="Display name"
                            placeholder="How should we call you?"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            maxLength={50}
                            required
                            autoFocus
                        />

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bio (optional)</label>
                            <textarea
                                placeholder="Tell us about yourself..."
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                maxLength={150}
                                rows={3}
                                className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                            />
                            <p className="text-xs text-muted-foreground text-right">
                                {bio.length}/150
                            </p>
                        </div>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            isLoading={isSubmitting}
                            disabled={!displayName.trim()}
                        >
                            Continue
                        </Button>
                    </form>

                    {/* Step indicator */}
                    <div className="mt-8 flex justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div className="w-2 h-2 rounded-full bg-muted" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
