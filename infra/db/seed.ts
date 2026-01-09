// Seed script for development
// Creates an admin user

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Create admin user
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@chatapp.com' },
        update: {},
        create: {
            email: 'admin@chatapp.com',
            isAdmin: true,
            status: 'ACTIVE',
            username: {
                create: {
                    username: 'admin',
                },
            },
            profile: {
                create: {
                    displayName: 'System Admin',
                    bio: 'Platform administrator',
                    theme: 'DARK',
                },
            },
        },
    });

    console.log('✅ Admin user created:', adminUser.email);

    // Create test users
    const testEmails = [
        'alice@example.com',
        'bob@example.com',
        'charlie@example.com',
    ];

    for (let i = 0; i < testEmails.length; i++) {
        const email = testEmails[i];
        const name = email.split('@')[0];

        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                status: 'ACTIVE',
                username: {
                    create: {
                        username: name,
                    },
                },
                profile: {
                    create: {
                        displayName: name.charAt(0).toUpperCase() + name.slice(1),
                        theme: 'SYSTEM',
                    },
                },
            },
        });

        console.log(`✅ Test user created: ${email}`);
    }

    console.log('');
    console.log('🌱 Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
