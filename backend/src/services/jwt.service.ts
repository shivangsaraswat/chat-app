import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';

interface TokenPayload {
    userId: string;
    email: string;
    isAdmin: boolean;
}

export class JwtService {
    private static getSecrets() {
        const jwtSecret = process.env.JWT_SECRET;
        const refreshSecret = process.env.JWT_REFRESH_SECRET;

        if (!jwtSecret || !refreshSecret) {
            throw new Error('JWT secrets not configured');
        }

        return { jwtSecret, refreshSecret };
    }

    static generateAccessToken(payload: TokenPayload): string {
        const { jwtSecret } = this.getSecrets();
        const expiresIn = process.env.JWT_EXPIRES_IN || '15m';

        return jwt.sign(payload, jwtSecret, { expiresIn });
    }

    static generateRefreshToken(payload: TokenPayload): string {
        const { refreshSecret } = this.getSecrets();
        const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

        return jwt.sign(payload, refreshSecret, { expiresIn });
    }

    static async createTokenPair(userId: string, email: string, isAdmin: boolean) {
        const payload: TokenPayload = { userId, email, isAdmin };

        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken(payload);

        // Store refresh token in database
        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await prisma.refreshToken.create({
            data: {
                token: hashedToken,
                userId,
                expiresAt,
            },
        });

        return { accessToken, refreshToken };
    }

    static async refreshTokens(refreshToken: string) {
        const { refreshSecret } = this.getSecrets();

        // Verify the refresh token
        let decoded: TokenPayload;
        try {
            decoded = jwt.verify(refreshToken, refreshSecret) as TokenPayload;
        } catch {
            throw new Error('Invalid refresh token');
        }

        // Check if token exists in database
        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: hashedToken },
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            throw new Error('Refresh token expired or not found');
        }

        // Get fresh user data
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user || user.status !== 'ACTIVE') {
            throw new Error('User not found or inactive');
        }

        // Delete old refresh token
        await prisma.refreshToken.delete({
            where: { token: hashedToken },
        });

        // Generate new token pair
        return this.createTokenPair(user.id, user.email, user.isAdmin);
    }

    static async revokeRefreshToken(refreshToken: string) {
        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

        await prisma.refreshToken.deleteMany({
            where: { token: hashedToken },
        });
    }

    static async revokeAllUserTokens(userId: string) {
        await prisma.refreshToken.deleteMany({
            where: { userId },
        });
    }
}
