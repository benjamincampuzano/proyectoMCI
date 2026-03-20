const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCoupleNetwork() {
    console.log('--- Testing Couple Merging in Network Tree ---');
    try {
        // 1. Create Pastor
        const pastor = await prisma.user.create({
            data: {
                email: 'pastor_test_couple@test.com',
                password: 'Password123!',
                profile: { create: { fullName: 'Pastor de Prueba' } },
                roles: { create: { role: { connect: { name: 'PASTOR' } } } }
            }
        });

        // 2. Create Spouse A (Lider Doce)
        const spouseA = await prisma.user.create({
            data: {
                email: 'spouse_a@test.com',
                password: 'Password123!',
                profile: { create: { fullName: 'Esposo A' } },
                roles: { create: { role: { connect: { name: 'LIDER_DOCE' } } } }
            }
        });

        // 3. Create Spouse B (Lider Doce) and link to A
        const spouseB = await prisma.user.create({
            data: {
                email: 'spouse_b@test.com',
                password: 'Password123!',
                spouseId: spouseA.id,
                profile: { create: { fullName: 'Esposa B' } },
                roles: { create: { role: { connect: { name: 'LIDER_DOCE' } } } }
            }
        });
        
        // Ensure symmetry
        await prisma.user.update({
            where: { id: spouseA.id },
            data: { spouseId: spouseB.id }
        });

        // 4. Link both spouses to Pastor
        await prisma.userHierarchy.createMany({
            data: [
                { parentId: pastor.id, childId: spouseA.id, role: 'PASTOR' },
                { parentId: pastor.id, childId: spouseB.id, role: 'PASTOR' }
            ]
        });

        // 5. Create Disciple and link to BOTH spouses
        const disciple = await prisma.user.create({
            data: {
                email: 'disciple_couple@test.com',
                password: 'Password123!',
                profile: { create: { fullName: 'Discipulo Compartido' } },
                roles: { create: { role: { connect: { name: 'DISCIPULO' } } } }
            }
        });

        await prisma.userHierarchy.createMany({
            data: [
                { parentId: spouseA.id, childId: disciple.id, role: 'LIDER_DOCE' },
                { parentId: spouseB.id, childId: disciple.id, role: 'LIDER_DOCE' }
            ]
        });

        console.log('Users created and linked.');

        // 6. Mock req/res for getNetwork
        const { getNetwork } = require('../controllers/networkController');
        const req = { params: { userId: pastor.id.toString() } };
        let result = null;
        const res = {
            json: (data) => { result = data; },
            status: (code) => ({ json: (err) => { console.error('Error Response:', err); } })
        };

        await getNetwork(req, res);

        console.log('\nTree structure:');
        // console.log(JSON.stringify(result, null, 2));

        const level1 = result.disciples;
        console.log(`Level 1 nodes: ${level1.length}`);
        
        const coupleNode = level1.find(n => n.isCouple);
        if (coupleNode) {
            console.log('SUCCESS: Couple node detected.');
            console.log(`Couple name: ${coupleNode.fullName}`);
            console.log(`Disciples under couple: ${coupleNode.disciples.length}`);
            
            if (coupleNode.disciples.length === 1 && coupleNode.disciples[0].fullName === 'Discipulo Compartido') {
                console.log('SUCCESS: Disciple merged correctly.');
            } else {
                console.log('FAILURE: Disciple count or name mismatch.');
            }
        } else {
            console.log('FAILURE: No couple node found at level 1.');
            console.log('Sample node name:', level1[0]?.fullName);
        }

        // Cleanup
        await prisma.userHierarchy.deleteMany({ where: { childId: { in: [spouseA.id, spouseB.id, disciple.id] } } });
        await prisma.userHierarchy.deleteMany({ where: { parentId: { in: [spouseA.id, spouseB.id, disciple.id] } } });
        await prisma.user.deleteMany({ where: { id: { in: [pastor.id, spouseA.id, spouseB.id, disciple.id] } } });
        console.log('\nCleanup complete.');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testCoupleNetwork();
