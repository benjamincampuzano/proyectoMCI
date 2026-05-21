const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing Prisma connection...');
    const usersCount = await prisma.user.count();
    console.log('User count:', usersCount);

    const modules = await prisma.seminarModule.findMany({
        where: {
            type: {
                in: ['KIDS1', 'KIDS2', 'TEENS', 'JOVENES']
            },
            isDeleted: false
        }
    });
    console.log('Kids modules count:', modules.length);

    const coordinator = await prisma.moduleCoordinator.findFirst();
    console.log('First module coordinator:', coordinator);

    console.log('Test successful');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
