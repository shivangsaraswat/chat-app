import { Router, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { OtpService } from '../services/otp.service.js';
import { EmailService } from '../services/email.service.js';
import { JwtService } from '../services/jwt.service.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { normalizeUsername, isValidUsername } from '@chat-app/utils';
import { APP_CONSTANTS } from '@chat-app/config';

const router: RouterType = Router();

// ===========================================
// Validation Schemas
// ===========================================

const signupSchema = z.object({
    username: z
        .string()
        .min(APP_CONSTANTS.USERNAME_MIN_LENGTH)
        .max(APP_CONSTANTS.USERNAME_MAX_LENGTH)
        .regex(APP_CONSTANTS.USERNAME_REGEX, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    displayName: z.string().min(1).max(APP_CONSTANTS.DISPLAY_NAME_MAX_LENGTH),
});

const loginSchema = z.object({
    identifier: z.string().min(1, 'Username or email is required'),
    password: z.string().min(1, 'Password is required'),
});

const verifyEmailSchema = z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
    pin: z.string().length(6, 'PIN must be 6 digits'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const refreshTokenSchema = z.object({
    refreshToken: z.string(),
});

// ===========================================
// Check Username Availability
// ===========================================
router.get(
    '/check-username/:username',
    asyncHandler(async (req, res: Response) => {
        const { username } = req.params;

        if (!isValidUsername(username)) {
            res.json({
                success: true,
                data: { available: false, reason: 'Invalid username format' },
            });
            return;
        }

        const normalized = normalizeUsername(username);
        const existing = await prisma.username.findUnique({
            where: { username: normalized },
        });

        res.json({
            success: true,
            data: {
                available: !existing,
                reason: existing ? 'Username is already taken' : null,
            },
        });
    })
);

// ===========================================
// Signup - Step 1: Create account & send OTP
// ===========================================
router.post(
    '/signup',
    authRateLimiter,
    asyncHandler(async (req, res: Response) => {
        const { username, email, password, displayName } = signupSchema.parse(req.body);

        // Check if email already exists
        const existingEmail = await prisma.user.findUnique({
            where: { email },
        });

        if (existingEmail) {
            throw new AppError('An account with this email already exists', 409);
        }

        // Check username availability
        const normalized = normalizeUsername(username);
        const existingUsername = await prisma.username.findUnique({
            where: { username: normalized },
        });

        if (existingUsername) {
            throw new AppError('Username is already taken', 409);
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user with username and profile
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                emailVerified: false,
                username: {
                    create: { username: normalized },
                },
                profile: {
                    create: { displayName },
                },
            },
        });

        // Generate and send verification OTP
        const otp = await OtpService.generateOtp(user.id);

        // Send OTP
        try {
            await EmailService.sendOtpEmail(email, otp);
            console.log(`📧 Sent Verification OTP to ${email}`);
        } catch (error) {
            console.error('Failed to send verification email:', error);
            // Fallback to logging for dev/testing if email fails
            if (process.env.NODE_ENV === 'development') {
                console.log(`📧 [DEV FALLBACK] Verification OTP for ${email}: ${otp}`);
            } else {
                // In production, we might want to throw an error so the user knows
                throw new AppError('Failed to send verification email. Please try again later.', 500);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Account created. Please verify your email.',
            data: { email },
        });
    })
);

// ===========================================
// Verify Email
// ===========================================
router.post(
    '/verify-email',
    authRateLimiter,
    asyncHandler(async (req, res: Response) => {
        const { email, otp } = verifyEmailSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                username: true,
                profile: true,
            },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user.emailVerified) {
            throw new AppError('Email is already verified', 400);
        }

        const isValid = await OtpService.verifyOtp(user.id, otp);

        if (!isValid) {
            throw new AppError('Invalid or expired OTP', 401);
        }

        // Mark email as verified
        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
        });

        // Generate tokens
        const tokens = await JwtService.createTokenPair(
            user.id,
            user.email,
            user.isAdmin
        );

        res.json({
            success: true,
            message: 'Email verified successfully',
            data: {
                ...tokens,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username?.username,
                    displayName: user.profile?.displayName,
                    isAdmin: user.isAdmin,
                },
            },
        });
    })
);

// ===========================================
// Request OTP (Passwordless Login / Admin)
// ===========================================
router.post(
    '/request-otp',
    authRateLimiter,
    asyncHandler(async (req, res: Response) => {
        const { email } = forgotPasswordSchema.parse(req.body); // Reusing schema with just email

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Return success to prevent email enumeration
            res.json({
                success: true,
                message: 'If an account exists with this email, an OTP will be sent.',
            });
            return;
        }

        // Generate and send OTP
        const otp = await OtpService.generateOtp(user.id);

        try {
            await EmailService.sendOtpEmail(email, otp);
            console.log(`🔐 Sent Login OTP to ${email}`);
        } catch (error) {
            console.error('Failed to send login OTP:', error);
            if (process.env.NODE_ENV === 'development') {
                console.log(`🔐 [DEV FALLBACK] Login OTP for ${email}: ${otp}`);
            } else {
                throw new AppError('Failed to send login code. Please try again later.', 500);
            }
        }

        res.json({
            success: true,
            message: 'If an account exists with this email, an OTP will be sent.',
        });
    })
);

// ===========================================
// Verify OTP (Passwordless Login / Admin)
// ===========================================
router.post(
    '/verify-otp',
    authRateLimiter,
    asyncHandler(async (req, res: Response) => {
        const { email, otp } = verifyEmailSchema.parse(req.body); // Reusing schema

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                username: true,
                profile: true,
            },
        });

        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        const isValid = await OtpService.verifyOtp(user.id, otp);

        if (!isValid) {
            throw new AppError('Invalid or expired OTP', 401);
        }

        // Generate tokens
        const tokens = await JwtService.createTokenPair(
            user.id,
            user.email,
            user.isAdmin
        );

        res.json({
            success: true,
            data: {
                ...tokens,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username?.username,
                    displayName: user.profile?.displayName,
                    photoUrl: user.profile?.photoUrl,
                    isAdmin: user.isAdmin,
                },
            },
        });
    })
);

// ===========================================
// Change Password
// ===========================================
const changePasswordSchema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post(
    '/change-password',
    authRateLimiter,
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
        });

        if (!user || !user.passwordHash) {
            throw new AppError('User not found', 404);
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

        if (!isPasswordValid) {
            throw new AppError('Incorrect current password', 401);
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 12);

        // Update password
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });

        // Revoke all sessions (optional, but good for security)
        await JwtService.revokeAllUserTokens(user.id);

        // Generate new tokens
        const tokens = await JwtService.createTokenPair(
            user.id,
            user.email,
            user.isAdmin
        );

        res.json({
            success: true,
            message: 'Password changed successfully',
            data: tokens,
        });
    })
);

// ===========================================
// Login
// ===========================================
router.post(
    '/login',
    authRateLimiter,
    asyncHandler(async (req, res: Response) => {
        const { identifier, password } = loginSchema.parse(req.body);

        // Find user by email or username
        let user = await prisma.user.findUnique({
            where: { email: identifier },
            include: {
                username: true,
                profile: true,
            },
        });

        if (!user) {
            // Try to find by username
            const usernameRecord = await prisma.username.findUnique({
                where: { username: normalizeUsername(identifier) },
                include: {
                    user: {
                        include: {
                            username: true,
                            profile: true,
                        },
                    },
                },
            });
            user = usernameRecord?.user || null;
        }

        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        if (!user.passwordHash) {
            throw new AppError('Please reset your password', 401);
        }

        if (user.status !== 'ACTIVE') {
            throw new AppError('Account is not active', 403);
        }

        if (!user.emailVerified) {
            throw new AppError('Please verify your email first', 403);
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            throw new AppError('Invalid credentials', 401);
        }

        // Generate tokens
        const tokens = await JwtService.createTokenPair(
            user.id,
            user.email,
            user.isAdmin
        );

        res.json({
            success: true,
            data: {
                ...tokens,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username?.username,
                    displayName: user.profile?.displayName,
                    photoUrl: user.profile?.photoUrl,
                    isAdmin: user.isAdmin,
                },
            },
        });
    })
);

// ===========================================
// Forgot Password - Send PIN
// ===========================================
router.post(
    '/forgot-password',
    authRateLimiter,
    asyncHandler(async (req, res: Response) => {
        const { email } = forgotPasswordSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Don't reveal if email exists
            res.json({
                success: true,
                message: 'If an account exists with this email, a reset PIN will be sent.',
            });
            return;
        }

        // Generate 6-digit PIN
        const pin = Math.floor(100000 + Math.random() * 900000).toString();

        // Save PIN (expires in 15 minutes)
        await prisma.passwordReset.create({
            data: {
                userId: user.id,
                pin,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
        });

        // Send PIN
        try {
            await EmailService.sendOtpEmail(email, pin);
            console.log(`📧 Sent Password Reset PIN to ${email}`);
        } catch (error) {
            console.error('Failed to send reset PIN:', error);
            if (process.env.NODE_ENV === 'development') {
                console.log(`🔑 [DEV FALLBACK] Password reset PIN for ${email}: ${pin}`);
            }
        }

        res.json({
            success: true,
            message: 'If an account exists with this email, a reset PIN will be sent.',
        });
    })
);

// ===========================================
// Reset Password
// ===========================================
router.post(
    '/reset-password',
    authRateLimiter,
    asyncHandler(async (req, res: Response) => {
        const { email, pin, newPassword } = resetPasswordSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new AppError('Invalid email or PIN', 401);
        }

        // Find valid PIN
        const passwordReset = await prisma.passwordReset.findFirst({
            where: {
                userId: user.id,
                pin,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });

        if (!passwordReset) {
            throw new AppError('Invalid or expired PIN', 401);
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 12);

        // Update password and mark PIN as used
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { passwordHash },
            }),
            prisma.passwordReset.update({
                where: { id: passwordReset.id },
                data: { used: true },
            }),
        ]);

        res.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.',
        });
    })
);

// ===========================================
// Resend Verification OTP
// ===========================================
router.post(
    '/resend-otp',
    authRateLimiter,
    asyncHandler(async (req, res: Response) => {
        const { email } = forgotPasswordSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Don't reveal if email exists
            res.json({
                success: true,
                message: 'If an account exists with this email, a new OTP will be sent.',
            });
            return;
        }

        if (user.emailVerified) {
            throw new AppError('Email is already verified', 400);
        }

        // Generate and send OTP
        const otp = await OtpService.generateOtp(user.id);

        try {
            await EmailService.sendOtpEmail(email, otp);
            console.log(`📧 Resent OTP to ${email}`);
        } catch (error) {
            console.error('Failed to resend OTP:', error);
            if (process.env.NODE_ENV === 'development') {
                console.log(`📧 [DEV FALLBACK] Resent OTP for ${email}: ${otp}`);
            } else {
                throw new AppError('Failed to send verification email. Please try again later.', 500);
            }
        }

        res.json({
            success: true,
            message: 'If an account exists with this email, a new OTP will be sent.',
        });
    })
);

// ===========================================
// Refresh Token
// ===========================================
router.post(
    '/refresh',
    asyncHandler(async (req, res: Response) => {
        const { refreshToken } = refreshTokenSchema.parse(req.body);

        try {
            const tokens = await JwtService.refreshTokens(refreshToken);

            res.json({
                success: true,
                data: tokens,
            });
        } catch {
            throw new AppError('Invalid refresh token', 401);
        }
    })
);

// ===========================================
// Logout
// ===========================================
router.post(
    '/logout',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await JwtService.revokeRefreshToken(refreshToken);
        }

        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    })
);

// ===========================================
// Logout from all devices
// ===========================================
router.post(
    '/logout-all',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) {
            throw new AppError('Unauthorized', 401);
        }

        await JwtService.revokeAllUserTokens(req.user.userId);

        res.json({
            success: true,
            message: 'Logged out from all devices',
        });
    })
);

export default router;
