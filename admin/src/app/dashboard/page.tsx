'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Spinner } from '@chat-app/ui';
import {
    Users,
    MessageSquare,
    TrendingUp,
    Calendar,
    ChevronRight,
    LayoutDashboard,
    MessagesSquare,
    FileText,
    LogOut,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Stats {
    totalUsers: number;
    todayUsers: number;
    activeConversations: number;
    totalMessages: number;
    dailyRegistrations: { date: string; count: number }[];
}

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const tokens = localStorage.getItem('admin_tokens');
        if (!tokens) {
            router.replace('/');
            return;
        }

        const fetchStats = async () => {
            try {
                const { accessToken } = JSON.parse(tokens);
                const res = await fetch(`${API_URL}/api/admin/stats`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                if (!res.ok) {
                    if (res.status === 401 || res.status === 403) {
                        localStorage.removeItem('admin_tokens');
                        router.replace('/');
                        return;
                    }
                    throw new Error('Failed to fetch stats');
                }

                const data = await res.json();
                setStats(data.data);
            } catch {
                // Handle error
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('admin_tokens');
        router.replace('/');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-card p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold">CA</span>
                    </div>
                    <div>
                        <p className="font-semibold">ChatApp</p>
                        <p className="text-xs text-muted-foreground">Admin Portal</p>
                    </div>
                </div>

                <nav className="space-y-1 flex-1">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </Link>
                    <Link
                        href="/users"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        <Users className="w-5 h-5" />
                        Users
                    </Link>
                    <Link
                        href="/conversations"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        <MessagesSquare className="w-5 h-5" />
                        Conversations
                    </Link>
                    <Link
                        href="/audit-logs"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        <FileText className="w-5 h-5" />
                        Audit Logs
                    </Link>
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-8">
                <h1 className="text-2xl font-bold mb-8">Dashboard</h1>

                {/* Stats cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Users</p>
                                    <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Today's Signups</p>
                                    <p className="text-3xl font-bold">{stats?.todayUsers || 0}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-green-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Active Chats</p>
                                    <p className="text-3xl font-bold">{stats?.activeConversations || 0}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-purple-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Messages</p>
                                    <p className="text-3xl font-bold">{stats?.totalMessages || 0}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                                    <Calendar className="w-6 h-6 text-orange-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Daily registrations chart placeholder */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Registrations (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 flex items-end justify-around gap-2 px-4">
                            {stats?.dailyRegistrations.map((day, index) => {
                                const maxCount = Math.max(...stats.dailyRegistrations.map((d) => d.count), 1);
                                const height = (day.count / maxCount) * 100;
                                return (
                                    <div key={index} className="flex flex-col items-center gap-2">
                                        <div
                                            className="w-12 bg-primary rounded-t-lg transition-all"
                                            style={{ height: `${Math.max(height, 4)}%` }}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                                        </span>
                                    </div>
                                );
                            })}
                            {(!stats?.dailyRegistrations || stats.dailyRegistrations.length === 0) && (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                    No data available
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <Link href="/users">
                        <Card hoverable>
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Users className="w-8 h-8 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Manage Users</p>
                                        <p className="text-sm text-muted-foreground">
                                            View, search, and restrict users
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/conversations">
                        <Card hoverable>
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <MessagesSquare className="w-8 h-8 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">View Conversations</p>
                                        <p className="text-sm text-muted-foreground">
                                            Monitor and manage chats
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </main>
        </div>
    );
}
