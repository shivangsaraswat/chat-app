import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
export const authRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
