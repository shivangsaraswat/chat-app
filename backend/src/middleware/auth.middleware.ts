import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from './error.middleware.js';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        isAdmin: boolean;
    };
}

export const authMiddleware = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Authorization token required', 401);
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            throw new AppError('Invalid authorization header', 401);
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new AppError('Server configuration error', 500);
        }

        const decoded = jwt.verify(token, jwtSecret) as {
            userId: string;
            email: string;
            isAdmin: boolean;
        };

        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user || user.status !== 'ACTIVE') {
            throw new AppError('User not found or inactive', 401);
        }

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            isAdmin: user.isAdmin,
        };

        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return next(new AppError('Token expired', 401));
        }
        if (err instanceof jwt.JsonWebTokenError) {
            return next(new AppError('Invalid token', 401));
        }
        next(err);
    }
};

export const adminMiddleware = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) => {
    if (!req.user?.isAdmin) {
        return next(new AppError('Admin access required', 403));
    }
    next();
};

// Optional auth - doesn't throw if no token
export const optionalAuthMiddleware = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return next();
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return next();
        }

        const decoded = jwt.verify(token, jwtSecret) as {
            userId: string;
            email: string;
            isAdmin: boolean;
        };

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            isAdmin: decoded.isAdmin,
        };

        next();
    } catch {
        // Silently continue without auth
        next();
    }
};
