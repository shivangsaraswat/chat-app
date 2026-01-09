'use client';

import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';
import { SocketProvider } from './socket-provider';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <SocketProvider>
                    {children}
                </SocketProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export { useTheme } from './theme-provider';
export { useAuth } from './auth-provider';
export { useSocket } from './socket-provider';
