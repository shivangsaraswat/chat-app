import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export const metadata: Metadata = {
    title: 'ChatApp - Secure Messaging',
    description: 'Private, secure messaging platform with real-time chat, media sharing, and instant notifications.',
    manifest: '/manifest.json',
    applicationName: 'ChatApp',
    keywords: ['chat', 'messaging', 'social', 'communication', 'secure', 'private'],
    authors: [{ name: 'ChatApp Team' }],
    creator: 'ChatApp',
    publisher: 'ChatApp',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'ChatApp',
        startupImage: [
            {
                url: '/apple-touch-icon.png',
                media: '(device-width: 390px) and (device-height: 844px)',
            },
        ],
    },
    formatDetection: {
        telephone: false,
        email: false,
        address: false,
    },
    openGraph: {
        title: 'ChatApp - Secure Messaging',
        description: 'Private, secure messaging platform with real-time chat.',
        type: 'website',
        siteName: 'ChatApp',
    },
    twitter: {
        card: 'summary',
        title: 'ChatApp - Secure Messaging',
        description: 'Private, secure messaging platform with real-time chat.',
    },
    icons: {
        icon: [
            { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
            { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
        ],
        apple: [
            { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    },
    other: {
        'mobile-web-app-capable': 'yes',
        'msapplication-TileColor': '#0a0a0a',
        'msapplication-tap-highlight': 'no',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    ],
    viewportFit: 'cover',
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
