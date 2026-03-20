const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { assignHierarchy, getUserSpouse } = require('../services/hierarchyService');

async function testMultipleLeaders() {
    console.log('--- Starting Multiple Leaders Test ---');

    try {
        // 1. Create test users
        console.log('1. Creating test users...');
        const p1 = await prisma.user.create({
            data: {
                email: 'test_pastor1@test.com',
                password: 'password123',
                profile: { create: { fullName: 'Pastor One' } },
                roles: { create: { role: { connect: { name: 'PASTOR' } } } }
            }
        });
        const p2 = await prisma.user.create({
            data: {
                email: 'test_pastor2@test.com',
                password: 'password123',
                profile: { create: { fullName: 'Pastor Two' } },
                roles: { create: { role: { connect: { name: 'PASTOR' } } } }
            }
        });
        const p3 = await prisma.user.create({
            data: {
                email: 'test_pastor3@test.com',
                password: 'password123',
                profile: { create: { fullName: 'Pastor Three' } },
                roles: { create: { role: { connect: { name: 'PASTOR' } } } }
            }
        });
        const d12 = await prisma.user.create({
            data: {
                email: 'test_doce@test.com',
                password: 'password123',
                profile: { create: { fullName: 'Lider Doce Test' } },
                roles: { create: { role: { connect: { name: 'LIDER_DOCE' } } } }
            }
        });

        // 2. Assign 2 Pastores to Lider Doce
        console.log('2. Assigning 2 Pastores to Lider Doce...');
        await assignHierarchy({ parentId: p1.id, childId: d12.id, role: 'PASTOR' });
        await assignHierarchy({ parentId: p2.id, childId: d12.id, role: 'PASTOR' });
        
        const counts = await prisma.userHierarchy.count({
            where: { childId: d12.id, role: 'PASTOR' }
        });
        console.log(`   Pastores assigned: ${counts} (Expected: 2)`);

        // 3. Try to assign a 3rd Pastor (Should fail)
        console.log('3. Trying to assign a 3rd Pastor...');
        try {
            await assignHierarchy({ parentId: p3.id, childId: d12.id, role: 'PASTOR' });
            console.error('   Error: Allowed 3rd pastor assignment!');
        } catch (err) {
            console.log(`   Caught expected error: ${err.message}`);
        }

        // 4. Test Spouse Symmetry
        console.log('4. Testing Spouse Symmetry...');
        await prisma.user.update({
            where: { id: p1.id },
            data: { spouseId: p2.id }
        });
        
        // Check p2's spouse
        const p2Checked = await prisma.user.findUnique({
            where: { id: p2.id },
            include: { spouse: true, spouseOf: true }
        });
        const p2SpouseId = p2Checked.spouseId || (p2Checked.spouseOf ? p2Checked.spouseOf.id : null);
        console.log(`   Pastor 2 spouse ID: ${p2SpouseId} (Expected: ${p1.id})`);
        
        const spouseObj = await getUserSpouse(p1.id);
        console.log(`   Pastor 1 spouse Name from service: ${spouseObj?.profile?.fullName} (Expected: Pastor Two)`);

        // 5. Clean up
        console.log('5. Cleaning up...');
        await prisma.userHierarchy.deleteMany({ where: { childId: d12.id } });
        await prisma.userRole.deleteMany({ where: { userId: { in: [p1.id, p2.id, p3.id, d12.id] } } });
        await prisma.userProfile.deleteMany({ where: { userId: { in: [p1.id, p2.id, p3.id, d12.id] } } });
        await prisma.user.updateMany({ where: { id: { in: [p1.id, p2.id] } }, data: { spouseId: null } });
        await prisma.user.deleteMany({ where: { id: { in: [p1.id, p2.id, p3.id, d12.id] } } });

        console.log('--- Test Completed Successfully ---');
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testMultipleLeaders();
