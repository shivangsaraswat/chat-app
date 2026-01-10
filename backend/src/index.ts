import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/error.middleware.js';
import { rateLimiter } from './middleware/rateLimiter.middleware.js';
import { initSocketServer } from './socket/index.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import followRoutes from './routes/follow.routes.js';
import chatRoutes from './routes/chat.routes.js';
import adminRoutes from './routes/admin.routes.js';
import uploadRoutes from './routes/upload.routes.js';

// Load environment variables
dotenv.config();

const app: express.Application = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketServer(httpServer, {
    cors: {
        origin: [
            process.env.APP_URL || 'http://localhost:3000',
            process.env.ADMIN_URL || 'http://localhost:3001',
        ],
        credentials: true,
    },
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: [
        process.env.APP_URL || 'http://localhost:3000',
        process.env.ADMIN_URL || 'http://localhost:3001',
    ],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(rateLimiter);

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/conversations', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

// Error handler
app.use(errorHandler);

// Initialize Socket.IO
initSocketServer(io);

// Start server
const PORT = process.env.PORT || process.env.WS_PORT || 4000;

httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server ready`);
});

export { app, io };
