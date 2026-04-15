const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const rawData = await prisma.$queryRaw`SELECT network, COUNT(*) as count FROM "UserProfile" GROUP BY network`;
    console.log('Current network counts:', rawData);
  } catch (e) {
    console.error('Error fetching data:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
