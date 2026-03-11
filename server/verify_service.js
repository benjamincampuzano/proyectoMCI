const { createsHierarchyCycle } = require('./services/hierarchyService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testService() {

    try {
        // 1. Cycle Detection
        // Let's grab two random users
        const users = await prisma.user.findMany({ take: 2 });
        if (users.length < 2) {
            return;
        }

        const [u1, u2] = users;

        // Check if U1 can be parent of U1 (Self-loop) - Should be TRUE
        const selfLoop = await createsHierarchyCycle(u1.id, u1.id);

        // Check if U1 can be parent of U2 (Assuming no prior relation)
        // If they are unrelated, should be False.
        const normalCheck = await createsHierarchyCycle(u1.id, u2.id);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testService();
