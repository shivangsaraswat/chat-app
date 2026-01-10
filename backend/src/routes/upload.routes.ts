import { Router, Response } from 'express';
import type { Router as RouterType } from 'express';
import multer from 'multer';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { MediaService } from '../services/media.service.js';

const router: RouterType = Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
        // Accept images and videos
        if (
            file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('video/') ||
            file.mimetype === 'application/pdf'
        ) {
            cb(null, true);
        } else {
            cb(new Error('Only images, videos, and PDFs are allowed'));
        }
    },
});

// Upload media for chat message
router.post(
    '/chat/:conversationId',
    authMiddleware,
    upload.single('file'),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);
        if (!req.file) throw new AppError('No file uploaded', 400);

        const { conversationId } = req.params;

        try {
            // Generate a temporary message ID for the upload
            const tempMessageId = Date.now().toString();

            // Upload to ImageKit
            const result = await MediaService.uploadChatImage(
                req.file.buffer,
                conversationId,
                tempMessageId
            );

            res.json({
                success: true,
                data: {
                    url: result.url,
                    fileId: result.fileId,
                    width: result.width,
                    height: result.height,
                    size: result.size,
                    mimeType: req.file.mimetype,
                },
            });
        } catch (error) {
            console.error('Upload error:', error);
            throw new AppError('Failed to upload file', 500);
        }
    })
);

// Upload profile photo
router.post(
    '/profile',
    authMiddleware,
    upload.single('file'),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);
        if (!req.file) throw new AppError('No file uploaded', 400);

        // Only allow images for profile photos
        if (!req.file.mimetype.startsWith('image/')) {
            throw new AppError('Only images are allowed for profile photos', 400);
        }

        try {
            // Upload to ImageKit
            const result = await MediaService.uploadProfilePhoto(
                req.file.buffer,
                req.user.userId
            );

            res.json({
                success: true,
                data: {
                    url: result.url,
                    fileId: result.fileId,
                },
            });
        } catch (error) {
            console.error('Upload error:', error);
            throw new AppError('Failed to upload profile photo', 500);
        }
    })
);

// Get ImageKit auth params for client-side SDK (if needed)
router.get(
    '/auth',
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        if (!req.user) throw new AppError('Unauthorized', 401);

        const authParams = MediaService.getAuthParams();

        res.json({
            success: true,
            data: authParams,
        });
    })
);

export default router;
