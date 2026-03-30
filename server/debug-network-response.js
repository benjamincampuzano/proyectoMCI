const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugNetworkResponse() {
  try {
    console.log('=== DEBUGGING NETWORK RESPONSE FOR PASTOR (ID: 325) ===');
    
    // Simular la consulta del backend
    const pastor = await prisma.user.findUnique({
      where: { id: 325 },
      include: {
        profile: true,
        roles: { include: { role: true } },
        spouse: {
          select: {
            id: true,
            profile: { select: { fullName: true } },
            roles: { include: { role: true } }
          }
        },
        spouseOf: {
          select: {
            id: true,
            profile: { select: { fullName: true } },
            roles: { include: { role: true } }
          }
        },
        parents: {
          include: {
            parent: {
              include: {
                profile: true,
                roles: { include: { role: true } },
                spouse: { include: { profile: true } }
              }
            }
          }
        },
        children: {
          include: {
            child: true
          }
        }
      }
    });

    console.log('Pastor data:', JSON.stringify(pastor, null, 2));

    // Verificar spouse
    const spouseNode = pastor.spouse || pastor.spouseOf;
    console.log('Spouse found:', !!spouseNode);
    if (spouseNode) {
      console.log('Spouse ID:', spouseNode.id);
      console.log('Spouse Name:', spouseNode.profile?.fullName);
      console.log('Spouse Roles:', spouseNode.roles?.map(r => r.role.name));
    }

    // Construir partners como lo hace el backend
    const partners = spouseNode ? [
      { id: pastor.id, fullName: pastor.profile?.fullName, roles: pastor.roles.map(r => r.role.name) },
      { id: spouseNode.id, fullName: spouseNode.profile?.fullName, roles: spouseNode.roles.map(r => r.role.name) }
    ] : [
      { id: pastor.id, fullName: pastor.profile?.fullName, roles: pastor.roles.map(r => r.role.name) }
    ];

    console.log('\n=== PARTNERS ARRAY ===');
    console.log('Partners count:', partners.length);
    partners.forEach((partner, index) => {
      console.log(`Partner ${index + 1}:`, partner);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugNetworkResponse();
