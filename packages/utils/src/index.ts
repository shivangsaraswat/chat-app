import {
    format,
    formatDistanceToNow,
    isToday,
    isYesterday,
    isThisWeek,
    parseISO,
} from 'date-fns';

// ============================================
// Date Formatting
// ============================================

export function formatMessageTime(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date;

    if (isToday(d)) {
        return format(d, 'h:mm a');
    }

    if (isYesterday(d)) {
        return 'Yesterday';
    }

    if (isThisWeek(d)) {
        return format(d, 'EEEE');
    }

    return format(d, 'MMM d, yyyy');
}

export function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
}

export function formatFullDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'PPpp');
}

// ============================================
// Cursor Pagination Helpers
// ============================================

export function encodeCursor(value: string | Date): string {
    const stringValue = value instanceof Date ? value.toISOString() : value;
    return Buffer.from(stringValue).toString('base64');
}

export function decodeCursor(cursor: string): string {
    return Buffer.from(cursor, 'base64').toString('utf-8');
}

export function parseCursorAsDate(cursor: string): Date {
    const decoded = decodeCursor(cursor);
    return parseISO(decoded);
}

// ============================================
// String Utilities
// ============================================

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

export function capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// ============================================
// Username Validation
// ============================================

export function isValidUsername(username: string): boolean {
    const regex = /^[a-zA-Z0-9_]{3,30}$/;
    return regex.test(username);
}

export function normalizeUsername(username: string): string {
    return username.toLowerCase().trim();
}

// ============================================
// OTP Generation
// ============================================

export function generateOtp(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

// ============================================
// ID Generation
// ============================================

export function generateShortId(length: number = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < length; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
}

// ============================================
// File Utilities
// ============================================

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

export function getMimeType(filename: string): string {
    const ext = getFileExtension(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        pdf: 'application/pdf',
        zip: 'application/zip',
        txt: 'text/plain',
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

// ============================================
// Array Utilities
// ============================================

export function uniqueBy<T>(array: T[], key: keyof T): T[] {
    const seen = new Set();
    return array.filter((item) => {
        const k = item[key];
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
        const groupKey = String(item[key]);
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
    }, {} as Record<string, T[]>);
}

// ============================================
// Async Utilities
// ============================================

export function debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function throttle<T extends (...args: unknown[]) => void>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
