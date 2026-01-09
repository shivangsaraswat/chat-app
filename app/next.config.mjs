/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: [
        '@chat-app/ui',
        '@chat-app/types',
        '@chat-app/config',
        '@chat-app/utils',
    ],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'ik.imagekit.io',
            },
        ],
    },
};

export default nextConfig;
