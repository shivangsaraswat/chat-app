import { z } from 'zod';

// ============================================
// Environment Schema
// ============================================

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // JWT
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // Email
    SMTP_HOST: z.string(),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string(),
    SMTP_PASS: z.string(),
    EMAIL_FROM: z.string().email(),

    // ImageKit
    IMAGEKIT_PUBLIC_KEY: z.string(),
    IMAGEKIT_PRIVATE_KEY: z.string(),
    IMAGEKIT_URL_ENDPOINT: z.string().url(),

    // Application URLs
    APP_URL: z.string().url().default('http://localhost:3000'),
    ADMIN_URL: z.string().url().default('http://localhost:3001'),
    API_URL: z.string().url().default('http://localhost:4000'),

    // WebSocket
    WS_PORT: z.coerce.number().default(4000),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

    // Node Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type EnvConfig = z.infer<typeof envSchema>;

// ============================================
// Environment Validation
// ============================================

let envConfig: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
    if (envConfig) return envConfig;

    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.format());
        throw new Error('Invalid environment configuration');
    }

    envConfig = result.data;
    return envConfig;
}

export function getEnv(): EnvConfig {
    if (!envConfig) {
        return validateEnv();
    }
    return envConfig;
}

// ============================================
// Constants
// ============================================

export const APP_CONSTANTS = {
    // Pagination
    DEFAULT_PAGE_SIZE: 30,
    MAX_PAGE_SIZE: 100,

    // Username rules
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 30,
    USERNAME_REGEX: /^[a-zA-Z0-9_]+$/,

    // Profile limits
    DISPLAY_NAME_MAX_LENGTH: 50,
    BIO_MAX_LENGTH: 150,

    // Message limits
    MESSAGE_MAX_LENGTH: 4000,

    // OTP
    OTP_LENGTH: 6,
    OTP_EXPIRY_MINUTES: 10,

    // Media
    MAX_IMAGE_SIZE_MB: 10,
    MAX_FILE_SIZE_MB: 25,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_FILE_TYPES: ['application/pdf', 'application/zip', 'text/plain'],

    // Disappearing messages
    DISAPPEARING_DURATIONS: {
        OFF: null,
        '24_HOURS': 24 * 60 * 60 * 1000,
        '7_DAYS': 7 * 24 * 60 * 60 * 1000,
        '90_DAYS': 90 * 24 * 60 * 60 * 1000,
    },
} as const;

// ============================================
// API Routes
// ============================================

export const API_ROUTES = {
    // Auth
    AUTH: {
        REQUEST_OTP: '/api/auth/request-otp',
        VERIFY_OTP: '/api/auth/verify-otp',
        REFRESH_TOKEN: '/api/auth/refresh',
        LOGOUT: '/api/auth/logout',
    },

    // User
    USER: {
        ME: '/api/users/me',
        PROFILE: '/api/users/profile',
        USERNAME: '/api/users/username',
        CHECK_USERNAME: '/api/users/username/check',
        SEARCH: '/api/users/search',
        BY_ID: (id: string) => `/api/users/${id}`,
    },

    // Follow
    FOLLOW: {
        REQUEST: '/api/follows',
        PENDING: '/api/follows/pending',
        CONNECTIONS: '/api/follows/connections',
        RESPOND: (id: string) => `/api/follows/${id}/respond`,
        REMOVE: (id: string) => `/api/follows/${id}`,
    },

    // Conversations
    CONVERSATION: {
        LIST: '/api/conversations',
        CREATE: '/api/conversations',
        BY_ID: (id: string) => `/api/conversations/${id}`,
        MESSAGES: (id: string) => `/api/conversations/${id}/messages`,
    },

    // Admin
    ADMIN: {
        STATS: '/api/admin/stats',
        USERS: '/api/admin/users',
        USER_BY_ID: (id: string) => `/api/admin/users/${id}`,
        USER_RESTRICT: (id: string) => `/api/admin/users/${id}/restrict`,
        CONVERSATIONS: '/api/admin/conversations',
        CONVERSATION_BY_ID: (id: string) => `/api/admin/conversations/${id}`,
        AUDIT_LOGS: '/api/admin/audit-logs',
    },
} as const;

// ============================================
// Socket Events
// ============================================

export const SOCKET_EVENTS = {
    // Connection
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ERROR: 'error',

    // Messages
    MESSAGE_SEND: 'message:send',
    MESSAGE_NEW: 'message:new',
    MESSAGE_READ: 'message:read',
    MESSAGE_DELETE: 'message:delete',

    // Typing
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',

    // Presence
    USER_ONLINE: 'user:online',
    USER_OFFLINE: 'user:offline',

    // Room
    ROOM_JOIN: 'room:join',
    ROOM_LEAVE: 'room:leave',
} as const;


