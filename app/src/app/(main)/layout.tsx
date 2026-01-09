'use client';

import { usePathname } from 'next/navigation';
import { Dock } from '@/components/dock';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Hide dock when inside a chat conversation
    const isInChatConversation = pathname?.startsWith('/chats/') && pathname !== '/chats';

    return (
        <div className={isInChatConversation ? 'min-h-screen' : 'min-h-screen pb-24'}>
            {children}
            {!isInChatConversation && <Dock />}
        </div>
    );
}
