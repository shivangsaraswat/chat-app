import { prisma } from '../lib/prisma.js';
import { generateOtp } from '@chat-app/utils';

export class OtpService {
    private static readonly OTP_LENGTH = 6;
    private static readonly OTP_EXPIRY_MINUTES = 10;

    static async generateOtp(userId: string): Promise<string> {
        // Invalidate any existing OTPs
        await prisma.otp.updateMany({
            where: { userId, used: false },
            data: { used: true },
        });

        // Generate new OTP
        const code = generateOtp(this.OTP_LENGTH);

        // Calculate expiry
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

        // Store OTP
        await prisma.otp.create({
            data: {
                userId,
                code,
                expiresAt,
            },
        });

        return code;
    }

    static async verifyOtp(userId: string, code: string): Promise<boolean> {
        console.log('🔍 Verifying OTP:', { userId, code, currentTime: new Date() });

        // First, let's see ALL OTPs for this user
        const allOtps = await prisma.otp.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        console.log('🔍 All OTPs for user:', allOtps);

        const otp = await prisma.otp.findFirst({
            where: {
                userId,
                code,
                used: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        console.log('🔍 Found OTP:', otp);

        if (!otp) {
            return false;
        }

        // Mark OTP as used
        await prisma.otp.update({
            where: { id: otp.id },
            data: { used: true },
        });

        return true;
    }

    static async cleanupExpiredOtps(): Promise<void> {
        await prisma.otp.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { used: true },
                ],
            },
        });
    }
}
