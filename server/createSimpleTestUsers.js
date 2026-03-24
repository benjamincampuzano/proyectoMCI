// Versión simplificada para prueba rápida
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSimpleTestUsers() {
  try {
    console.log('🚀 Creando usuarios de prueba simples...');
    
    // Crear roles básicos si no existen
    const roles = ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'];
    for (const roleName of roles) {
      const existingRole = await prisma.role.findUnique({
        where: { name: roleName }
      });
      
      if (!existingRole) {
        await prisma.role.create({
          data: { name: roleName }
        });
        console.log(`✅ Rol ${roleName} creado`);
      }
    }
    
    // Crear usuarios de prueba básicos
    const testUsers = [
      {
        email: 'pastor@test.com',
        password: 'pastor123',
        fullName: 'Pastor Principal',
        role: 'PASTOR',
        phone: '3001111111',
        documentNumber: '10000001'
      },
      {
        email: 'lider12@test.com',
        password: 'lider123',
        fullName: 'Líder de Doce',
        role: 'LIDER_DOCE',
        phone: '3002222222',
        documentNumber: '10000002'
      },
      {
        email: 'lidercelula@test.com',
        password: 'celula123',
        fullName: 'Líder de Célula',
        role: 'LIDER_CELULA',
        phone: '3003333333',
        documentNumber: '10000003'
      },
      {
        email: 'discipulo@test.com',
        password: 'discipulo123',
        fullName: 'Discípulo Ejemplo',
        role: 'DISCIPULO',
        phone: '3004444444',
        documentNumber: '10000004'
      }
    ];
    
    for (const userData of testUsers) {
      // Verificar si usuario ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      
      if (existingUser) {
        console.log(`⚠️  Usuario ${userData.email} ya existe`);
        continue;
      }
      
      // Crear usuario
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          phone: userData.phone,
          isActive: true,
          isDeleted: false,
          mustChangePassword: false,
          profile: {
            create: {
              fullName: userData.fullName,
              documentType: 'CC',
              documentNumber: userData.documentNumber,
              city: 'Manizales',
              dataPolicyAccepted: true,
              dataTreatmentAuthorized: true
            }
          },
          roles: {
            create: {
              role: {
                connect: { name: userData.role }
              }
            }
          }
        },
        include: {
          profile: true,
          roles: {
            include: {
              role: true
            }
          }
        }
      });
      
      console.log(`✅ Usuario creado: ${user.profile.fullName} (${user.email}) - Rol: ${userData.role}`);
    }
    
    console.log('🎉 Usuarios de prueba creados exitosamente!');
    console.log('\n📋 Credenciales de prueba:');
    console.log('Pastor: pastor@test.com / pastor123');
    console.log('Líder 12: lider12@test.com / lider123');
    console.log('Líder Célula: lidercelula@test.com / celula123');
    console.log('Discípulo: discipulo@test.com / discipulo123');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createSimpleTestUsers();
}

module.exports = { createSimpleTestUsers };
