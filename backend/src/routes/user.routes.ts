import { Router, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { normalizeUsername, isValidUsername } from '@chat-app/utils';
import { APP_CONSTANTS } from '@chat-app/config';

const router: RouterType = Router();

// Validation schemas
const usernameSchema = z.object({
    username: z
        .string()
        .min(APP_CONSTANTS.USERNAME_MIN_LENGTH)
        .max(APP_CONSTANTS.USERNAME_MAX_LENGTH)
        .regex(APP_CONSTANTS.USERNAME_REGEX, 'Username can only contain letters, numbers, and underscores'),
});

const profileSchema = z.object({
    displayName: z.string().min(1).max(APP_CONSTANTS.DISPLAY_NAME_MAX_LENGTH),
    bio: z.string().max(APP_CONSTANTS.BIO_MAX_LENGTH).optional(),
    photoUrl: z.string().url().optional(),
});

const themeSchema = z.object({
    theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']),
});

// Get current user
router.get(
    '/me',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: {
                username: true,
                profile: true,
            },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Get follower/following counts
        const followersCount = await prisma.follow.count({
            where: { followingId: user.id, status: 'ACCEPTED' },
        });

        const followingCount = await prisma.follow.count({
            where: { followerId: user.id, status: 'ACCEPTED' },
        });

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                status: user.status,
                isAdmin: user.isAdmin,
                username: user.username?.username || null,
                profile: user.profile
                    ? {
                        displayName: user.profile.displayName,
                        bio: user.profile.bio,
                        photoUrl: user.profile.photoUrl,
                        theme: user.profile.theme,
                    }
                    : null,
                followersCount,
                followingCount,
                createdAt: user.createdAt,
            },
        });
    })
);

// Check username availability
router.get(
    '/username/check',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const username = req.query.username as string;

        if (!username) {
            throw new AppError('Username is required', 400);
        }

        if (!isValidUsername(username)) {
            throw new AppError('Invalid username format', 400);
        }

        const normalized = normalizeUsername(username);

        const existing = await prisma.username.findFirst({
            where: {
                username: {
                    equals: normalized,
                    mode: 'insensitive',
                },
            },
        });

        res.json({
            success: true,
            data: {
                available: !existing,
                username: normalized,
            },
        });
    })
);

// Set username (onboarding)
router.post(
    '/username',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { username } = usernameSchema.parse(req.body);
        const normalized = normalizeUsername(username);

        // Check if user already has a username
        const existingUserUsername = await prisma.username.findUnique({
            where: { userId: req.user.userId },
        });

        if (existingUserUsername) {
            throw new AppError('Username already set', 400);
        }

        // Check availability (case-insensitive)
        const existing = await prisma.username.findFirst({
            where: {
                username: {
                    equals: normalized,
                    mode: 'insensitive',
                },
            },
        });

        if (existing) {
            throw new AppError('Username is already taken', 400);
        }

        const created = await prisma.username.create({
            data: {
                userId: req.user.userId,
                username: normalized,
            },
        });

        res.json({
            success: true,
            data: {
                username: created.username,
            },
        });
    })
);

// Set/update profile
router.post(
    '/profile',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { displayName, bio, photoUrl } = profileSchema.parse(req.body);

        const profile = await prisma.profile.upsert({
            where: { userId: req.user.userId },
            update: {
                displayName,
                bio,
                photoUrl,
            },
            create: {
                userId: req.user.userId,
                displayName,
                bio,
                photoUrl,
            },
        });

        res.json({
            success: true,
            data: {
                displayName: profile.displayName,
                bio: profile.bio,
                photoUrl: profile.photoUrl,
                theme: profile.theme,
            },
        });
    })
);

// Update theme preference
router.patch(
    '/profile/theme',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { theme } = themeSchema.parse(req.body);

        const profile = await prisma.profile.upsert({
            where: { userId: req.user.userId },
            update: { theme },
            create: {
                userId: req.user.userId,
                displayName: 'User',
                theme,
            },
        });

        res.json({
            success: true,
            data: {
                theme: profile.theme,
            },
        });
    })
);

// Search users
router.get(
    '/search',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const query = req.query.q as string;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

        if (!query || query.length < 2) {
            return res.json({
                success: true,
                data: [],
            });
        }

        const users = await prisma.user.findMany({
            where: {
                id: { not: req.user.userId },
                status: 'ACTIVE',
                OR: [
                    {
                        username: {
                            username: { contains: query, mode: 'insensitive' },
                        },
                    },
                    {
                        profile: {
                            displayName: { contains: query, mode: 'insensitive' },
                        },
                    },
                ],
            },
            include: {
                username: true,
                profile: true,
            },
            take: limit,
        });

        res.json({
            success: true,
            data: users.map((user) => ({
                id: user.id,
                username: user.username?.username,
                displayName: user.profile?.displayName,
                photoUrl: user.profile?.photoUrl,
            })),
        });
    })
);

// Get user by ID
router.get(
    '/:id',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id, status: 'ACTIVE' },
            include: {
                username: true,
                profile: true,
            },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Check if blocked
        const blocked = await prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: req.user.userId, blockedId: id },
                    { blockerId: id, blockedId: req.user.userId },
                ],
            },
        });

        if (blocked) {
            throw new AppError('User not found', 404);
        }

        // Get follow status
        const follow = await prisma.follow.findFirst({
            where: {
                OR: [
                    { followerId: req.user.userId, followingId: id },
                    { followerId: id, followingId: req.user.userId },
                ],
            },
        });

        // Get follower/following counts
        const followersCount = await prisma.follow.count({
            where: { followingId: id, status: 'ACCEPTED' },
        });

        const followingCount = await prisma.follow.count({
            where: { followerId: id, status: 'ACCEPTED' },
        });

        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username?.username,
                displayName: user.profile?.displayName,
                bio: user.profile?.bio,
                photoUrl: user.profile?.photoUrl,
                isConnected: follow?.status === 'ACCEPTED',
                followStatus: follow
                    ? follow.followerId === req.user.userId
                        ? follow.status
                        : 'received'
                    : null,
                followersCount,
                followingCount,
            },
        });
    })
);

export default router;
