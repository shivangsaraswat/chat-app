'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { User, UserWithProfile, AuthTokens } from '@chat-app/types';

interface AuthContextType {
    user: UserWithProfile | null;
    tokens: AuthTokens | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (tokens: AuthTokens, user: Partial<User>) => void;
    logout: () => void;
    updateUser: (user: Partial<UserWithProfile>) => void;
    refreshTokens: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserWithProfile | null>(null);
    const [tokens, setTokens] = useState<AuthTokens | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load tokens from localStorage on mount
    useEffect(() => {
        const loadAuth = async () => {
            const storedTokens = localStorage.getItem('tokens');

            if (storedTokens) {
                const parsed = JSON.parse(storedTokens) as AuthTokens;
                setTokens(parsed);

                // Fetch user data
                try {
                    const res = await fetch(`${API_URL}/api/users/me`, {
                        headers: {
                            Authorization: `Bearer ${parsed.accessToken}`,
                        },
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setUser(data.data);
                    } else {
                        // Token might be expired, try refresh
                        const refreshed = await refreshTokensInternal(parsed.refreshToken);
                        if (!refreshed) {
                            localStorage.removeItem('tokens');
                        }
                    }
                } catch {
                    // Network error - keep tokens, user will retry
                }
            }

            setIsLoading(false);
        };

        loadAuth();
    }, []);

    const refreshTokensInternal = async (refreshToken: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (res.ok) {
                const data = await res.json();
                const newTokens = data.data as AuthTokens;
                setTokens(newTokens);
                localStorage.setItem('tokens', JSON.stringify(newTokens));

                // Fetch user with new token
                const userRes = await fetch(`${API_URL}/api/users/me`, {
                    headers: {
                        Authorization: `Bearer ${newTokens.accessToken}`,
                    },
                });

                if (userRes.ok) {
                    const userData = await userRes.json();
                    setUser(userData.data);
                }

                return true;
            }
        } catch {
            // Refresh failed
        }

        return false;
    };

    const login = useCallback((newTokens: AuthTokens, userData: Partial<User>) => {
        setTokens(newTokens);
        setUser(userData as UserWithProfile);
        localStorage.setItem('tokens', JSON.stringify(newTokens));
    }, []);

    const logout = useCallback(async () => {
        if (tokens?.refreshToken) {
            try {
                await fetch(`${API_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${tokens.accessToken}`,
                    },
                    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
                });
            } catch {
                // Continue with logout even if API fails
            }
        }

        setUser(null);
        setTokens(null);
        localStorage.removeItem('tokens');
    }, [tokens]);

    const updateUser = useCallback((updates: Partial<UserWithProfile>) => {
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
    }, []);

    const refreshTokens = useCallback(async (): Promise<boolean> => {
        if (!tokens?.refreshToken) return false;
        return refreshTokensInternal(tokens.refreshToken);
    }, [tokens]);

    return (
        <AuthContext.Provider
            value={{
                user,
                tokens,
                isLoading,
                isAuthenticated: !!user && !!tokens,
                login,
                logout,
                updateUser,
                refreshTokens,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
