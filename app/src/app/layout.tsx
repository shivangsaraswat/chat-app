import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export const metadata: Metadata = {
    title: 'ChatApp',
    description: 'Private, secure messaging platform',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'ChatApp',
    },
    formatDetection: {
        telephone: false,
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#000000',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
            </head>
            <body className={`${inter.variable} font-sans bg-zinc-950 flex justify-center min-h-[100dvh]`}>
                <div className="w-full max-w-[480px] bg-black min-h-[100dvh] relative shadow-2xl overflow-x-hidden border-x border-zinc-800">
                    <Providers>{children}</Providers>
                </div>
            </body>
        </html>
    );
}
