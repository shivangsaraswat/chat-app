import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    isAdmin?: boolean;
}

interface JwtPayload {
    userId: string;
    email: string;
    isAdmin: boolean;
}

export function initSocketServer(io: Server) {
    // Authentication middleware
    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                return next(new Error('Server configuration error'));
            }

            const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

            // Verify user exists and is active
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
            });

            if (!user || user.status !== 'ACTIVE') {
                return next(new Error('User not found or inactive'));
            }

            socket.userId = decoded.userId;
            socket.isAdmin = user.isAdmin;
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', async (socket: AuthenticatedSocket) => {
        if (!socket.userId) return;

        console.log(`🔌 User connected: ${socket.userId}`);

        // Join user's personal room for direct messages
        socket.join(`user:${socket.userId}`);

        // Get user's conversations and join their rooms
        const conversations = await prisma.conversationParticipant.findMany({
            where: {
                userId: socket.userId,
                leftAt: null,
            },
            select: { conversationId: true },
        });

        conversations.forEach((conv) => {
            socket.join(`conversation:${conv.conversationId}`);
        });

        // Handle joining a specific conversation room
        socket.on('room:join', async (conversationId: string) => {
            if (!socket.userId) return;

            // Verify user is participant
            const participant = await prisma.conversationParticipant.findFirst({
                where: {
                    conversationId,
                    userId: socket.userId,
                    leftAt: null,
                },
            });

            if (participant) {
                socket.join(`conversation:${conversationId}`);
                console.log(`📥 User ${socket.userId} joined room ${conversationId}`);
            }
        });

        // Handle leaving a conversation room
        socket.on('room:leave', (conversationId: string) => {
            socket.leave(`conversation:${conversationId}`);
            console.log(`📤 User ${socket.userId} left room ${conversationId}`);
        });

        // Handle typing indicators
        socket.on('typing:start', (data: { conversationId: string }) => {
            socket.to(`conversation:${data.conversationId}`).emit('typing:start', {
                conversationId: data.conversationId,
                userId: socket.userId,
                isTyping: true,
            });
        });

        socket.on('typing:stop', (data: { conversationId: string }) => {
            socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
                conversationId: data.conversationId,
                userId: socket.userId,
                isTyping: false,
            });
        });

        // Handle message read receipts
        socket.on(
            'message:read',
            async (data: { conversationId: string; messageId: string }) => {
                if (!socket.userId) return;

                // Update last read timestamp
                await prisma.conversationParticipant.updateMany({
                    where: {
                        conversationId: data.conversationId,
                        userId: socket.userId,
                    },
                    data: { lastReadAt: new Date() },
                });

                // Emit to other participants
                socket.to(`conversation:${data.conversationId}`).emit('message:read', {
                    conversationId: data.conversationId,
                    messageId: data.messageId,
                    userId: socket.userId,
                });
            }
        );

        // Handle user going online
        socket.broadcast.emit('user:online', {
            userId: socket.userId,
            isOnline: true,
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${socket.userId}`);
            socket.broadcast.emit('user:offline', {
                userId: socket.userId,
                isOnline: false,
                lastSeen: new Date(),
            });
        });
    });

    console.log('📡 Socket.IO server initialized');
}
