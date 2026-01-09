'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@chat-app/ui';
import { Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import { useAuth, useTheme } from '@/components/providers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type ThemeOption = 'LIGHT' | 'DARK' | 'SYSTEM';

const themes: { value: ThemeOption; label: string; icon: typeof Sun; description: string }[] = [
    { value: 'LIGHT', label: 'Light', icon: Sun, description: 'Clean and bright' },
    { value: 'DARK', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    { value: 'SYSTEM', label: 'System', icon: Monitor, description: 'Match your device' },
];

export default function ThemePreferencePage() {
    const router = useRouter();
    const { tokens } = useAuth();
    const { setTheme: setAppTheme } = useTheme();
    const [selectedTheme, setSelectedTheme] = useState<ThemeOption>('SYSTEM');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleThemeSelect = (theme: ThemeOption) => {
        setSelectedTheme(theme);
        // Preview the theme
        setAppTheme(theme.toLowerCase() as 'light' | 'dark' | 'system');
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            await fetch(`${API_URL}/api/users/profile/theme`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tokens?.accessToken}`,
                },
                body: JSON.stringify({ theme: selectedTheme }),
            });

            // Navigate to main app
            router.replace('/chats');
        } catch {
            // Continue anyway - theme preference is not critical
            router.replace('/chats');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50">
            <Card className="w-full max-w-md" padding="lg">
                <CardHeader>
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Palette className="w-7 h-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Choose your theme</CardTitle>
                    <CardDescription>
                        Personalize your experience. You can change this anytime in settings.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div className="space-y-3 mb-8">
                        {themes.map(({ value, label, icon: Icon, description }) => (
                            <button
                                key={value}
                                onClick={() => handleThemeSelect(value)}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${selectedTheme === value
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedTheme === value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                    }`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-medium">{label}</p>
                                    <p className="text-sm text-muted-foreground">{description}</p>
                                </div>
                                {selectedTheme === value && (
                                    <Check className="w-5 h-5 text-primary" />
                                )}
                            </button>
                        ))}
                    </div>

                    <Button
                        onClick={handleSubmit}
                        size="lg"
                        className="w-full"
                        isLoading={isSubmitting}
                    >
                        Get Started
                    </Button>

                    {/* Step indicator */}
                    <div className="mt-8 flex justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
