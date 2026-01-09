'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is now handled by the signup flow
// Redirect to signup if accessed directly
export default function VerifyPage() {
    const router = useRouter();

    useEffect(() => {
        const email = sessionStorage.getItem('pendingEmail');
        if (!email) {
            router.replace('/login');
        }
    }, [router]);

    return null;
}
