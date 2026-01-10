import { Router, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router: RouterType = Router();

// Validation schemas
const followRequestSchema = z.object({
    userId: z.string().uuid(),
});

const respondSchema = z.object({
    accept: z.boolean(),
});

// Send follow request
router.post(
    '/',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { userId: targetUserId } = followRequestSchema.parse(req.body);

        if (targetUserId === req.user.userId) {
            throw new AppError('Cannot follow yourself', 400);
        }

        // Check if target user exists and is active
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId, status: 'ACTIVE' },
        });

        if (!targetUser) {
            throw new AppError('User not found', 404);
        }

        // Check if blocked
        const blocked = await prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: req.user.userId, blockedId: targetUserId },
                    { blockerId: targetUserId, blockedId: req.user.userId },
                ],
            },
        });

        if (blocked) {
            throw new AppError('Cannot follow this user', 400);
        }

        // Check if follow already exists
        const existingFollow = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: req.user.userId,
                    followingId: targetUserId,
                },
            },
        });

        if (existingFollow) {
            if (existingFollow.status === 'PENDING') {
                throw new AppError('Follow request already sent', 400);
            }
            if (existingFollow.status === 'ACCEPTED') {
                throw new AppError('Already following this user', 400);
            }
            // If rejected, allow resending
        }

        const follow = await prisma.follow.upsert({
            where: {
                followerId_followingId: {
                    followerId: req.user.userId,
                    followingId: targetUserId,
                },
            },
            update: {
                status: 'PENDING',
            },
            create: {
                followerId: req.user.userId,
                followingId: targetUserId,
                status: 'PENDING',
            },
        });

        res.json({
            success: true,
            data: {
                id: follow.id,
                status: follow.status,
            },
        });
    })
);

// Check follow status between current user and target user
router.get(
    '/status/:userId',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { userId: targetUserId } = req.params;

        if (targetUserId === req.user.userId) {
            return res.json({
                success: true,
                data: {
                    canMessage: true,
                    iAmFollowing: false,
                    theyAreFollowing: false,
                    isSelf: true,
                },
            });
        }

        // Check if I am following them (and accepted)
        const iFollowThem = await prisma.follow.findFirst({
            where: {
                followerId: req.user.userId,
                followingId: targetUserId,
                status: 'ACCEPTED',
            },
        });

        // Check if they are following me (and accepted)
        const theyFollowMe = await prisma.follow.findFirst({
            where: {
                followerId: targetUserId,
                followingId: req.user.userId,
                status: 'ACCEPTED',
            },
        });

        // Check if I have a pending request to them
        const myPendingRequest = await prisma.follow.findFirst({
            where: {
                followerId: req.user.userId,
                followingId: targetUserId,
                status: 'PENDING',
            },
        });

        // Check if they have a pending request to me  
        const theirPendingRequest = await prisma.follow.findFirst({
            where: {
                followerId: targetUserId,
                followingId: req.user.userId,
                status: 'PENDING',
            },
        });

        // Can message only if both are following each other (mutual)
        const canMessage = !!(iFollowThem && theyFollowMe);

        res.json({
            success: true,
            data: {
                canMessage,
                iAmFollowing: !!iFollowThem,
                theyAreFollowing: !!theyFollowMe,
                myRequestPending: !!myPendingRequest,
                theirRequestPending: !!theirPendingRequest,
                isSelf: false,
            },
        });
    })
);

// Get pending requests (received)
router.get(
    '/pending',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const requests = await prisma.follow.findMany({
            where: {
                followingId: req.user.userId,
                status: 'PENDING',
            },
            include: {
                follower: {
                    include: {
                        username: true,
                        profile: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({
            success: true,
            data: requests.map((r) => ({
                id: r.id,
                user: {
                    id: r.follower.id,
                    username: r.follower.username?.username,
                    displayName: r.follower.profile?.displayName,
                    photoUrl: r.follower.profile?.photoUrl,
                },
                createdAt: r.createdAt,
            })),
        });
    })
);

// Get followers list
router.get(
    '/:userId/followers',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { userId } = req.params;
        const cursor = req.query.cursor as string | undefined;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

        const follows = await prisma.follow.findMany({
            where: {
                followingId: userId,
                status: 'ACCEPTED',
                ...(cursor && {
                    createdAt: { lt: new Date(cursor) },
                }),
            },
            include: {
                follower: {
                    include: {
                        username: true,
                        profile: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
        });

        const hasMore = follows.length > limit;
        const items = follows.slice(0, limit);

        res.json({
            success: true,
            data: {
                items: items.map((f) => ({
                    id: f.follower.id,
                    username: f.follower.username?.username,
                    displayName: f.follower.profile?.displayName,
                    photoUrl: f.follower.profile?.photoUrl,
                    isFollowing: false, // Additional logic needed if we want to show "Follow back" status
                })),
                nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
                hasMore,
            },
        });
    })
);

// Get following list
router.get(
    '/:userId/following',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { userId } = req.params;
        const cursor = req.query.cursor as string | undefined;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

        const follows = await prisma.follow.findMany({
            where: {
                followerId: userId,
                status: 'ACCEPTED',
                ...(cursor && {
                    createdAt: { lt: new Date(cursor) },
                }),
            },
            include: {
                following: {
                    include: {
                        username: true,
                        profile: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
        });

        const hasMore = follows.length > limit;
        const items = follows.slice(0, limit);

        res.json({
            success: true,
            data: {
                items: items.map((f) => ({
                    id: f.following.id,
                    username: f.following.username?.username,
                    displayName: f.following.profile?.displayName,
                    photoUrl: f.following.profile?.photoUrl,
                    isFollowing: true,
                })),
                nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
                hasMore,
            },
        });
    })
);

// Get connections (mutual follows)
router.get(
    '/connections',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const cursor = req.query.cursor as string | undefined;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

        // Find all accepted follows where user is either follower or following
        const follows = await prisma.follow.findMany({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { followerId: req.user.userId },
                    { followingId: req.user.userId },
                ],
                ...(cursor && {
                    createdAt: { lt: new Date(cursor) },
                }),
            },
            include: {
                follower: {
                    include: {
                        username: true,
                        profile: true,
                    },
                },
                following: {
                    include: {
                        username: true,
                        profile: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
        });

        const hasMore = follows.length > limit;
        const items = follows.slice(0, limit);

        // Map to connections (the other user)
        const connections = items.map((f) => {
            const other = f.followerId === req.user!.userId ? f.following : f.follower;
            return {
                id: other.id,
                username: other.username?.username,
                displayName: other.profile?.displayName,
                photoUrl: other.profile?.photoUrl,
                connectedAt: f.createdAt,
            };
        });

        res.json({
            success: true,
            data: {
                items: connections,
                nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
                hasMore,
            },
        });
    })
);

// Respond to follow request
router.post(
    '/:id/respond',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { id } = req.params;
        const { accept } = respondSchema.parse(req.body);

        const follow = await prisma.follow.findUnique({
            where: { id },
        });

        if (!follow || follow.followingId !== req.user.userId) {
            throw new AppError('Follow request not found', 404);
        }

        if (follow.status !== 'PENDING') {
            throw new AppError('Follow request already processed', 400);
        }

        const updated = await prisma.follow.update({
            where: { id },
            data: {
                status: accept ? 'ACCEPTED' : 'REJECTED',
            },
        });

        // If accepted, create reverse follow automatically for mutual connection
        if (accept) {
            await prisma.follow.upsert({
                where: {
                    followerId_followingId: {
                        followerId: req.user.userId,
                        followingId: follow.followerId,
                    },
                },
                update: {
                    status: 'ACCEPTED',
                },
                create: {
                    followerId: req.user.userId,
                    followingId: follow.followerId,
                    status: 'ACCEPTED',
                },
            });
        }

        res.json({
            success: true,
            data: {
                status: updated.status,
            },
        });
    })
);

// Remove connection
router.delete(
    '/:id',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { id } = req.params;

        // Delete both directions of the follow
        await prisma.follow.deleteMany({
            where: {
                OR: [
                    { followerId: req.user.userId, followingId: id },
                    { followerId: id, followingId: req.user.userId },
                ],
            },
        });

        res.json({
            success: true,
            message: 'Connection removed',
        });
    })
);

export default router;
