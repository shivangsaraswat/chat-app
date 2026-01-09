import ImageKit from 'imagekit';

interface UploadResult {
    url: string;
    fileId: string;
    width?: number;
    height?: number;
    size: number;
}

export class MediaService {
    private static imagekit: ImageKit | null = null;

    private static getImageKit(): ImageKit {
        if (this.imagekit) return this.imagekit;

        this.imagekit = new ImageKit({
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
        });

        return this.imagekit;
    }

    static async uploadImage(
        file: Buffer | string,
        fileName: string,
        folder: string = 'uploads'
    ): Promise<UploadResult> {
        const imagekit = this.getImageKit();

        const response = await imagekit.upload({
            file,
            fileName,
            folder,
        });

        return {
            url: response.url,
            fileId: response.fileId,
            width: response.width,
            height: response.height,
            size: response.size,
        };
    }

    static async uploadProfilePhoto(
        file: Buffer | string,
        userId: string
    ): Promise<UploadResult> {
        return this.uploadImage(file, `profile_${userId}`, 'profiles');
    }

    static async uploadChatImage(
        file: Buffer | string,
        conversationId: string,
        messageId: string
    ): Promise<UploadResult> {
        return this.uploadImage(
            file,
            `${conversationId}_${messageId}`,
            'chat-images'
        );
    }

    static async uploadSticker(
        file: Buffer | string,
        stickerId: string
    ): Promise<UploadResult> {
        return this.uploadImage(file, stickerId, 'stickers');
    }

    static async deleteFile(fileId: string): Promise<void> {
        const imagekit = this.getImageKit();
        await imagekit.deleteFile(fileId);
    }

    static getAuthParams() {
        const imagekit = this.getImageKit();
        return imagekit.getAuthenticationParameters();
    }

    static getOptimizedUrl(
        url: string,
        options: {
            width?: number;
            height?: number;
            quality?: number;
        } = {}
    ): string {
        const transformations: string[] = [];

        if (options.width) transformations.push(`w-${options.width}`);
        if (options.height) transformations.push(`h-${options.height}`);
        if (options.quality) transformations.push(`q-${options.quality}`);

        if (transformations.length === 0) return url;

        const endpoint = process.env.IMAGEKIT_URL_ENDPOINT || '';
        const path = url.replace(endpoint, '');

        return `${endpoint}/tr:${transformations.join(',')}${path}`;
    }
}
