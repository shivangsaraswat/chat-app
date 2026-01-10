import { Router, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { encodeCursor, decodeCursor } from '@chat-app/utils';
import { io } from '../index.js';

const router: RouterType = Router();

// Validation schemas
const createConversationSchema = z.object({
    userId: z.string().uuid(),
});

const sendMessageSchema = z.object({
    type: z.enum(['TEXT', 'IMAGE', 'FILE', 'STICKER', 'VIEW_ONCE']).default('TEXT'),
    content: z.preprocess(
        (val) => (val === null ? undefined : val),
        z.string().max(4000).optional()
    ),
    mediaUrl: z.string().url().optional(),
    additionalMediaUrls: z.array(z.string().url()).optional(),
    isViewOnce: z.boolean().optional(),
    isDisappearing: z.boolean().optional(),
    expiresAt: z.string().datetime().optional(),
});

// Get all conversations
router.get(
    '/',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const cursor = req.query.cursor as string | undefined;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

        const conversations = await prisma.conversation.findMany({
            where: {
                deletedAt: null,
                participants: {
                    some: {
                        userId: req.user.userId,
                        leftAt: null,
                    },
                },
            },
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
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    where: { deletedAt: null },
                },
            },
            orderBy: { updatedAt: 'desc' },
            ...(cursor && {
                cursor: { id: decodeCursor(cursor) },
                skip: 1,
            }),
            take: limit + 1,
        });

        const hasMore = conversations.length > limit;
        const items = conversations.slice(0, limit);

        // Calculate unread counts for each conversation
        const itemsWithUnread = await Promise.all(items.map(async (conv) => {
            const currentUserParticipant = conv.participants.find(
                (p) => p.userId === req.user!.userId
            );
            const otherParticipant = conv.participants.find(
                (p) => p.userId !== req.user!.userId
            );
            const lastMessage = conv.messages[0];

            // Count unread messages (messages after lastReadAt from other users)
            const unreadCount = currentUserParticipant?.lastReadAt
                ? await prisma.message.count({
                    where: {
                        conversationId: conv.id,
                        senderId: { not: req.user!.userId },
                        deletedAt: null,
                        createdAt: { gt: currentUserParticipant.lastReadAt },
                    },
                })
                : await prisma.message.count({
                    where: {
                        conversationId: conv.id,
                        senderId: { not: req.user!.userId },
                        deletedAt: null,
                    },
                });

            return {
                id: conv.id,
                participant: otherParticipant
                    ? {
                        id: otherParticipant.user.id,
                        username: otherParticipant.user.username?.username,
                        displayName: otherParticipant.user.profile?.displayName,
                        photoUrl: otherParticipant.user.profile?.photoUrl,
                    }
                    : null,
                lastMessage: lastMessage
                    ? {
                        id: lastMessage.id,
                        type: lastMessage.type,
                        content: lastMessage.isViewOnce ? null : lastMessage.content,
                        senderId: lastMessage.senderId,
                        createdAt: lastMessage.createdAt,
                    }
                    : null,
                unreadCount,
                updatedAt: conv.updatedAt,
            };
        }));

        res.json({
            success: true,
            data: {
                items: itemsWithUnread,
                nextCursor: hasMore
                    ? encodeCursor(items[items.length - 1].id)
                    : null,
                hasMore,
            },
        });
    })
);

// Create or get existing conversation
router.post(
    '/',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { userId: targetUserId } = createConversationSchema.parse(req.body);

        if (targetUserId === req.user.userId) {
            throw new AppError('Cannot create conversation with yourself', 400);
        }

        // Check if users are connected
        const connection = await prisma.follow.findFirst({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { followerId: req.user.userId, followingId: targetUserId },
                    { followerId: targetUserId, followingId: req.user.userId },
                ],
            },
        });

        if (!connection) {
            throw new AppError('Users must be connected to chat', 403);
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
            throw new AppError('Cannot create conversation with this user', 403);
        }

        // Check for existing conversation
        const existing = await prisma.conversation.findFirst({
            where: {
                deletedAt: null,
                AND: [
                    {
                        participants: {
                            some: { userId: req.user.userId, leftAt: null },
                        },
                    },
                    {
                        participants: {
                            some: { userId: targetUserId, leftAt: null },
                        },
                    },
                ],
            },
        });

        if (existing) {
            return res.json({
                success: true,
                data: { id: existing.id },
            });
        }

        // Create new conversation
        const conversation = await prisma.conversation.create({
            data: {
                participants: {
                    create: [
                        { userId: req.user.userId },
                        { userId: targetUserId },
                    ],
                },
            },
        });

        res.status(201).json({
            success: true,
            data: { id: conversation.id },
        });
    })
);

// Get conversation messages
router.get(
    '/:id/messages',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { id } = req.params;
        const cursor = req.query.cursor as string | undefined;
        const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);

        // Verify user is participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: {
                conversationId: id,
                userId: req.user.userId,
                leftAt: null,
            },
        });

        if (!participant) {
            throw new AppError('Conversation not found', 404);
        }

        const messages = await prisma.message.findMany({
            where: {
                conversationId: id,
                // Don't filter by deletedAt - include deleted messages
                ...(cursor && {
                    createdAt: { lt: new Date(decodeCursor(cursor)) },
                }),
            },
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
            take: limit + 1,
        });

        const hasMore = messages.length > limit;
        const items = messages.slice(0, limit);

        // Update last read
        await prisma.conversationParticipant.update({
            where: { id: participant.id },
            data: { lastReadAt: new Date() },
        });

        res.json({
            success: true,
            data: {
                items: items.map((msg) => ({
                    id: msg.id,
                    type: msg.type,
                    content: msg.isViewOnce ? null : msg.content,
                    isViewOnce: msg.isViewOnce,
                    isDisappearing: msg.isDisappearing,
                    expiresAt: msg.expiresAt,
                    deletedAt: msg.deletedAt,
                    sender: {
                        id: msg.sender.id,
                        username: msg.sender.username?.username,
                        displayName: msg.sender.profile?.displayName,
                        photoUrl: msg.sender.profile?.photoUrl,
                    },
                    media: msg.media.map((m) => ({
                        id: m.id,
                        url: m.url,
                        mimeType: m.mimeType,
                        size: m.size,
                        width: m.width,
                        height: m.height,
                    })),
                    createdAt: msg.createdAt,
                })),
                nextCursor: hasMore
                    ? encodeCursor(items[items.length - 1].createdAt.toISOString())
                    : null,
                hasMore,
            },
        });
    })
);

// Send message
router.post(
    '/:id/messages',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { id } = req.params;
        const { type, content, mediaUrl, additionalMediaUrls, isViewOnce, isDisappearing, expiresAt } =
            sendMessageSchema.parse(req.body);

        // Verify user is participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: {
                conversationId: id,
                userId: req.user.userId,
                leftAt: null,
            },
            include: {
                conversation: {
                    include: {
                        participants: true,
                    },
                },
            },
        });

        if (!participant) {
            throw new AppError('Conversation not found', 404);
        }

        // Check if blocked
        const otherParticipant = participant.conversation.participants.find(
            (p) => p.userId !== req.user!.userId
        );

        if (otherParticipant) {
            const blocked = await prisma.block.findFirst({
                where: {
                    OR: [
                        { blockerId: req.user.userId, blockedId: otherParticipant.userId },
                        { blockerId: otherParticipant.userId, blockedId: req.user.userId },
                    ],
                },
            });

            if (blocked) {
                throw new AppError('Cannot send message to this user', 403);
            }
        }

        // Collect all media URLs
        const allMediaUrls: string[] = [];
        if (mediaUrl) allMediaUrls.push(mediaUrl);
        if (additionalMediaUrls) allMediaUrls.push(...additionalMediaUrls);

        // Create message with media
        const message = await prisma.message.create({
            data: {
                conversationId: id,
                senderId: req.user.userId,
                type,
                content,
                isViewOnce: isViewOnce ?? false,
                isDisappearing: isDisappearing ?? false,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                ...(allMediaUrls.length > 0 && {
                    media: {
                        create: allMediaUrls.map((url) => ({
                            url,
                            mimeType: 'image/jpeg', // TODO: Detect from URL
                            size: 0,
                        })),
                    },
                }),
            },
            include: {
                sender: {
                    include: {
                        username: true,
                        profile: true,
                    },
                },
                media: true,
            },
        });

        // Update conversation updatedAt
        await prisma.conversation.update({
            where: { id },
            data: { updatedAt: new Date() },
        });

        // Emit to socket room
        console.log(`📤 Emitting message to room conversation:${id}`, message.id);
        io.to(`conversation:${id}`).emit('message:new', {
            conversationId: id,
            message: {
                id: message.id,
                type: message.type,
                content: message.isViewOnce ? null : message.content,
                isViewOnce: message.isViewOnce,
                isDisappearing: message.isDisappearing,
                sender: {
                    id: message.sender.id,
                    username: message.sender.username?.username,
                    displayName: message.sender.profile?.displayName,
                    photoUrl: message.sender.profile?.photoUrl,
                },
                media: message.media,
                createdAt: message.createdAt,
            },
        });
        console.log(`📤 Message emitted successfully`);

        res.status(201).json({
            success: true,
            data: {
                id: message.id,
                createdAt: message.createdAt,
            },
        });
    })
);

// Get single conversation
router.get(
    '/:id',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { id } = req.params;

        const conversation = await prisma.conversation.findFirst({
            where: {
                id,
                deletedAt: null,
                participants: {
                    some: {
                        userId: req.user.userId,
                        leftAt: null,
                    },
                },
            },
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

        const otherParticipant = conversation.participants.find(
            (p) => p.userId !== req.user!.userId
        );

        res.json({
            success: true,
            data: {
                id: conversation.id,
                participant: otherParticipant
                    ? {
                        id: otherParticipant.user.id,
                        username: otherParticipant.user.username?.username,
                        displayName: otherParticipant.user.profile?.displayName,
                        photoUrl: otherParticipant.user.profile?.photoUrl,
                    }
                    : null,
                createdAt: conversation.createdAt,
            },
        });
    })
);

// Delete message
const deleteMessageSchema = z.object({
    forEveryone: z.boolean().default(false),
});

router.delete(
    '/:id/messages/:messageId',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { id: conversationId, messageId } = req.params;
        const { forEveryone } = deleteMessageSchema.parse(req.body);

        // Verify user is participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: {
                conversationId,
                userId: req.user.userId,
                leftAt: null,
            },
        });

        if (!participant) {
            throw new AppError('Conversation not found', 404);
        }

        // Find the message
        const message = await prisma.message.findFirst({
            where: {
                id: messageId,
                conversationId,
                deletedAt: null,
            },
        });

        if (!message) {
            throw new AppError('Message not found', 404);
        }

        if (forEveryone) {
            // Only sender can delete for everyone
            if (message.senderId !== req.user.userId) {
                throw new AppError('You can only delete your own messages for everyone', 403);
            }

            // Soft delete the message
            await prisma.message.update({
                where: { id: messageId },
                data: { deletedAt: new Date() },
            });

            // Emit to socket room
            io.to(`conversation:${conversationId}`).emit('message:deleted', {
                conversationId,
                messageId,
                forEveryone: true,
            });
        }
        // For "delete for me", we could use a separate table for user-specific deletions
        // For simplicity, we just return success (client removes from local state)

        res.json({
            success: true,
            data: { messageId, forEveryone },
        });
    })
);

// Get conversation media (shared photos, videos, files)
router.get(
    '/:id/media',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const { id } = req.params;
        const type = req.query.type as string | undefined;
        const cursor = req.query.cursor as string | undefined;
        const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);

        // Verify user is participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: {
                conversationId: id,
                userId: req.user.userId,
                leftAt: null,
            },
        });

        if (!participant) {
            throw new AppError('Conversation not found', 404);
        }

        // Build query for media messages
        const whereClause: any = {
            conversationId: id,
            deletedAt: null,
            media: {
                some: {}, // Has at least one media item
            },
            ...(type && { type }), // Filter by type if provided (IMAGE, VIDEO, FILE)
            ...(cursor && {
                createdAt: { lt: new Date(decodeCursor(cursor)) },
            }),
        };

        const messages = await prisma.message.findMany({
            where: whereClause,
            include: {
                media: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
        });

        const hasMore = messages.length > limit;
        const items = messages.slice(0, limit);

        // Flatten media items from messages
        const mediaItems = items.flatMap((msg) =>
            msg.media.map((m) => ({
                id: m.id,
                messageId: msg.id,
                url: m.url,
                mimeType: m.mimeType,
                size: m.size,
                width: m.width,
                height: m.height,
                createdAt: msg.createdAt,
            }))
        );

        res.json({
            success: true,
            data: {
                items: mediaItems,
                nextCursor: hasMore
                    ? encodeCursor(items[items.length - 1].createdAt.toISOString())
                    : null,
                hasMore,
            },
        });
    })
);

export default router;
