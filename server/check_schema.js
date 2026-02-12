const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
    try {
        const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'UserProfile';
    `;
        console.log('Columns in UserProfile:', result.map(r => r.column_name));

        const resultGuest = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Guest';
    `;
        console.log('Columns in Guest:', resultGuest.map(r => r.column_name));
    } catch (error) {
        console.error('Error checking schema:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
