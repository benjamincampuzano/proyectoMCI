const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConventionQuery() {
    const fields = ['year', 'theme', 'cost', 'transportCost', 'accommodationCost', 'endDate'];

    for (const field of fields) {
        try {
            console.log(`Testing field: ${field}...`);
            await prisma.convention.findMany({
                select: { id: true, [field]: true }
            });
            console.log(`${field}: OK`);
        } catch (e) {
            console.error(`${field}: FAIL - ${e.message}`);
            if (e.meta) console.error('Meta:', e.meta);
        }
    }

    await prisma.$disconnect();
}

testConventionQuery();
