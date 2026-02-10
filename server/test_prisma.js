const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const conventions = await prisma.convention.findMany({
            take: 1,
            select: { id: true, coordinatorId: true }
        });
        console.log('Success! Conventions:', JSON.stringify(conventions, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
