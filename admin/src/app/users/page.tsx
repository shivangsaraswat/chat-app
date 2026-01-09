'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Avatar, Input, Button, Spinner } from '@chat-app/ui';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    Ban,
    MessageSquareOff,
    LayoutDashboard,
    Users,
    MessagesSquare,
    FileText,
    LogOut,
} from 'lucide-react';
import { formatRelativeTime } from '@chat-app/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface User {
    id: string;
    email: string;
    phone?: string;
    status: string;
    isAdmin: boolean;
    username?: string;
    displayName?: string;
    photoUrl?: string;
    createdAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchUsers = async (page: number, search?: string) => {
        const tokens = localStorage.getItem('admin_tokens');
        if (!tokens) {
            router.replace('/');
            return;
        }

        setIsLoading(true);
        try {
            const { accessToken } = JSON.parse(tokens);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                ...(search && { search }),
            });

            const res = await fetch(`${API_URL}/api/admin/users?${params}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('admin_tokens');
                    router.replace('/');
                    return;
                }
                throw new Error('Failed to fetch users');
            }

            const data = await res.json();
            setUsers(data.data.items);
            setPagination(data.data.pagination);
        } catch {
            // Handle error
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(currentPage, searchQuery);
    }, [currentPage]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchUsers(1, searchQuery);
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_tokens');
        router.replace('/');
    };

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
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </Link>
                    <Link
                        href="/users"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary"
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
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold">Users</h1>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 rounded-lg bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                            />
                        </div>
                        <Button type="submit" variant="secondary" size="sm">
                            Search
                        </Button>
                    </form>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <>
                        <Card>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                                                User
                                            </th>
                                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                                                Email
                                            </th>
                                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                                                Status
                                            </th>
                                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                                                Joined
                                            </th>
                                            <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar
                                                            src={user.photoUrl}
                                                            alt={user.displayName}
                                                            fallback={user.displayName || user.username || user.email}
                                                            size="default"
                                                        />
                                                        <div>
                                                            <p className="font-medium">
                                                                {user.displayName || user.username || 'No name'}
                                                            </p>
                                                            {user.username && (
                                                                <p className="text-sm text-muted-foreground">
                                                                    @{user.username}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm">{user.email}</td>
                                                <td className="p-4">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.status === 'ACTIVE'
                                                                ? 'bg-green-500/10 text-green-500'
                                                                : user.status === 'DEACTIVATED'
                                                                    ? 'bg-yellow-500/10 text-yellow-500'
                                                                    : 'bg-red-500/10 text-red-500'
                                                            }`}
                                                    >
                                                        {user.status}
                                                    </span>
                                                    {user.isAdmin && (
                                                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                            Admin
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-sm text-muted-foreground">
                                                    {formatRelativeTime(user.createdAt)}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link
                                                            href={`/users/${user.id}`}
                                                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                                                            title="View details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Link>
                                                        {!user.isAdmin && (
                                                            <>
                                                                <button
                                                                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                                                                    title="Restrict profile"
                                                                >
                                                                    <Ban className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                                                                    title="Disable messaging"
                                                                >
                                                                    <MessageSquareOff className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6">
                                <p className="text-sm text-muted-foreground">
                                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                                    {pagination.total} users
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => p - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => p + 1)}
                                        disabled={currentPage === pagination.totalPages}
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
