import { Router, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router: RouterType = Router();

// All admin routes require auth and admin middleware
router.use(authMiddleware);
router.use(adminMiddleware);

// Validation schemas
const restrictUserSchema = z.object({
    restrictProfile: z.boolean().optional(),
    restrictMessaging: z.boolean().optional(),
});

// Get dashboard stats
router.get(
    '/stats',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [totalUsers, todayUsers, activeConversations, totalMessages] =
            await Promise.all([
                prisma.user.count({ where: { status: 'ACTIVE' } }),
                prisma.user.count({
                    where: {
                        createdAt: { gte: today },
                    },
                }),
                prisma.conversation.count({
                    where: { deletedAt: null },
                }),
                prisma.message.count({
                    where: { deletedAt: null },
                }),
            ]);

        // Get daily registrations for the last 7 days
        const dailyRegistrations = await prisma.$queryRaw<
            { date: Date; count: bigint }[]
        >`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= ${lastWeek}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

        res.json({
            success: true,
            data: {
                totalUsers,
                todayUsers,
                activeConversations,
                totalMessages,
                dailyRegistrations: dailyRegistrations.map((r) => ({
                    date: r.date,
                    count: Number(r.count),
                })),
            },
        });
    })
);

// Get all users
router.get(
    '/users',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const search = req.query.search as string | undefined;

        const where = {
            ...(search && {
                OR: [
                    { email: { contains: search, mode: 'insensitive' as const } },
                    {
                        username: {
                            username: { contains: search, mode: 'insensitive' as const },
                        },
                    },
                    {
                        profile: {
                            displayName: { contains: search, mode: 'insensitive' as const },
                        },
                    },
                ],
            }),
        };

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    username: true,
                    profile: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.user.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                items: users.map((user) => ({
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    status: user.status,
                    isAdmin: user.isAdmin,
                    username: user.username?.username,
                    displayName: user.profile?.displayName,
                    photoUrl: user.profile?.photoUrl,
                    createdAt: user.createdAt,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    })
);

// Get user by ID
router.get(
    '/users/:id',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                username: true,
                profile: true,
                _count: {
                    select: {
                        following: true,
                        followers: true,
                        messages: true,
                    },
                },
            },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Log admin action
        await prisma.adminLog.create({
            data: {
                adminId: req.user.userId,
                actionType: 'VIEW_USER',
                targetType: 'USER',
                targetId: id,
            },
        });

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                status: user.status,
                isAdmin: user.isAdmin,
                username: user.username?.username,
                profile: user.profile
                    ? {
                        displayName: user.profile.displayName,
                        bio: user.profile.bio,
                        photoUrl: user.profile.photoUrl,
                        theme: user.profile.theme,
                    }
                    : null,
                stats: {
                    following: user._count.following,
                    followers: user._count.followers,
                    messages: user._count.messages,
                },
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    })
);

// Restrict user
router.post(
    '/users/:id/restrict',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { id } = req.params;
        const { restrictProfile, restrictMessaging } = restrictUserSchema.parse(
            req.body
        );

        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user.isAdmin) {
            throw new AppError('Cannot restrict admin users', 403);
        }

        // Update user status based on restrictions
        if (restrictMessaging) {
            await prisma.user.update({
                where: { id },
                data: { status: 'DEACTIVATED' },
            });
        }

        // Log admin actions
        if (restrictProfile !== undefined) {
            await prisma.adminLog.create({
                data: {
                    adminId: req.user.userId,
                    actionType: restrictProfile ? 'RESTRICT_USER' : 'UNRESTRICT_USER',
                    targetType: 'USER',
                    targetId: id,
                    metadata: { type: 'profile' },
                },
            });
        }

        if (restrictMessaging !== undefined) {
            await prisma.adminLog.create({
                data: {
                    adminId: req.user.userId,
                    actionType: restrictMessaging
                        ? 'DISABLE_MESSAGING'
                        : 'ENABLE_MESSAGING',
                    targetType: 'USER',
                    targetId: id,
                },
            });
        }

        res.json({
            success: true,
            message: 'User restrictions updated',
        });
    })
);

// Get all conversations
router.get(
    '/conversations',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        const [conversations, total] = await Promise.all([
            prisma.conversation.findMany({
                where: { deletedAt: null },
                include: {
                    participants: {
                        include: {
                            user: {
                                include: {
                                    username: true,
                                    profile: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: { messages: true },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.conversation.count({ where: { deletedAt: null } }),
        ]);

        res.json({
            success: true,
            data: {
                items: conversations.map((conv) => ({
                    id: conv.id,
                    participants: conv.participants.map((p) => ({
                        id: p.user.id,
                        username: p.user.username?.username,
                        displayName: p.user.profile?.displayName,
                    })),
                    messageCount: conv._count.messages,
                    createdAt: conv.createdAt,
                    updatedAt: conv.updatedAt,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    })
);

// Get conversation by ID (admin view)
router.get(
    '/conversations/:id',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { id } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

        const conversation = await prisma.conversation.findUnique({
            where: { id },
            include: {
                participants: {
                    include: {
                        user: {
                            include: {
                                username: true,
                                profile: true,
                            },
                        },
                    },
                },
            },
        });

        if (!conversation) {
            throw new AppError('Conversation not found', 404);
        }

        const [messages, total] = await Promise.all([
            prisma.message.findMany({
                where: { conversationId: id, deletedAt: null },
                include: {
                    sender: {
                        include: {
                            username: true,
                            profile: true,
                        },
                    },
                    media: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.message.count({
                where: { conversationId: id, deletedAt: null },
            }),
        ]);

        // Log admin action
        await prisma.adminLog.create({
            data: {
                adminId: req.user.userId,
                actionType: 'VIEW_CONVERSATION',
                targetType: 'CONVERSATION',
                targetId: id,
            },
        });

        res.json({
            success: true,
            data: {
                id: conversation.id,
                participants: conversation.participants.map((p) => ({
                    id: p.user.id,
                    username: p.user.username?.username,
                    displayName: p.user.profile?.displayName,
                    photoUrl: p.user.profile?.photoUrl,
                })),
                messages: messages.map((msg) => ({
                    id: msg.id,
                    type: msg.type,
                    content: msg.content,
                    sender: {
                        id: msg.sender.id,
                        username: msg.sender.username?.username,
                        displayName: msg.sender.profile?.displayName,
                    },
                    media: msg.media,
                    createdAt: msg.createdAt,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
                createdAt: conversation.createdAt,
            },
        });
    })
);

// Delete conversation
router.delete(
    '/conversations/:id',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { id } = req.params;

        const conversation = await prisma.conversation.findUnique({
            where: { id },
        });

        if (!conversation) {
            throw new AppError('Conversation not found', 404);
        }

        // Soft delete conversation and all messages
        await prisma.$transaction([
            prisma.conversation.update({
                where: { id },
                data: { deletedAt: new Date() },
            }),
            prisma.message.updateMany({
                where: { conversationId: id },
                data: { deletedAt: new Date() },
            }),
        ]);

        // Log admin action
        await prisma.adminLog.create({
            data: {
                adminId: req.user.userId,
                actionType: 'DELETE_CONVERSATION',
                targetType: 'CONVERSATION',
                targetId: id,
            },
        });

        res.json({
            success: true,
            message: 'Conversation deleted',
        });
    })
);

// Get audit logs
router.get(
    '/audit-logs',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const actionType = req.query.actionType as string | undefined;

        const where = {
            ...(actionType && { actionType: actionType as any }),
        };

        const [logs, total] = await Promise.all([
            prisma.adminLog.findMany({
                where,
                include: {
                    admin: {
                        include: {
                            username: true,
                            profile: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.adminLog.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                items: logs.map((log) => ({
                    id: log.id,
                    admin: {
                        id: log.admin.id,
                        username: log.admin.username?.username,
                        displayName: log.admin.profile?.displayName,
                    },
                    actionType: log.actionType,
                    targetType: log.targetType,
                    targetId: log.targetId,
                    metadata: log.metadata,
                    createdAt: log.createdAt,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    })
);

export default router;
