require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Mapeo de roles del archivo al enum de la base de datos
const ROLE_MAPPING = {
  'PASTOR': 'PASTOR',
  'LIDER_DOCE': 'LIDER_DOCE', 
  'LIDER_CELULA': 'LIDER_CELULA',
  'DISCIPULO': 'DISCIPULO',
  'INVITADO': 'MIEMBRO' // Mapeamos INVITADO a MIEMBRO ya que no existe INVITADO en el enum
};

// Función para parsear la fecha en formato DD/MM/YYYY
function parseDate(dateString) {
  if (!dateString) return null;
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;
  
  const [day, month, year] = parts;
  // Asumimos que los años de 2 dígitos son 1900s
  const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
  
  const date = new Date(fullYear, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
}

// Función para limpiar y parsear el archivo BBDD_Prueba.md
function parseBBDDFile() {
  const filePath = path.join(__dirname, '../BBDD_Prueba.md');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const users = [];
  let currentCity = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detectar ciudad (líneas que empiezan con | y tienen formato de ciudad)
    if (line.startsWith('|') && line.includes('|') && !line.includes('Nombre Completo')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 2 && parts[1] && !parts[1].includes('Nombre') && !parts[1].includes('CC')) {
        currentCity = parts[1];
        continue;
      }
    }
    
    // Detectar línea de usuario
    if (line.includes('@') && line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 8) {
        try {
          const user = {
            city: currentCity || 'Manizales',
            liderInmediato: parts[0] || '',
            lider12: parts[1] || '',
            fullName: parts[2] || '',
            documentNumber: parts[3] || '',
            birthDate: parseDate(parts[4]),
            email: parts[5] || '',
            password: parts[6] || '',
            role: parts[7] || '',
            phone: parts[8] || '',
            address: parts[9] || ''
          };
          
          // Solo incluir usuarios con email y rol válidos
          if (user.email && user.role && ROLE_MAPPING[user.role]) {
            users.push(user);
          }
        } catch (error) {
          console.log('Error parsing line:', line, error);
        }
      }
    }
  }
  
  return users;
}

// Función para crear o encontrar roles
async function ensureRoles() {
  const roles = Object.values(ROLE_MAPPING);
  
  for (const roleName of roles) {
    const existingRole = await prisma.role.findUnique({
      where: { name: roleName }
    });
    
    if (!existingRole) {
      await prisma.role.create({
        data: {
          name: roleName,
          permissions: {
            create: [
              { permission: { connect: { key: 'READ_USERS' } } },
              { permission: { connect: { key: 'READ_PROFILE' } } }
            ]
          }
        }
      });
      console.log(`✅ Rol ${roleName} creado`);
    }
  }
}

// Función para crear usuario y su perfil
async function createUserData(userData) {
  const { email, password, fullName, role, phone, documentNumber, birthDate, address, city } = userData;
  
  // Hashear contraseña
  const hashedPassword = await bcrypt.hash(password.replace('*', ''), 10);
  
  // Crear usuario
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      phone: phone || null,
      isActive: true,
      isDeleted: false,
      mustChangePassword: false,
      isCoordinator: role === 'PASTOR',
      profile: {
        create: {
          fullName,
          documentType: 'CC',
          documentNumber: documentNumber || null,
          birthDate,
          address,
          city,
          dataPolicyAccepted: true,
          dataTreatmentAuthorized: true,
          minorConsentAuthorized: false
        }
      },
      roles: {
        create: {
          role: {
            connect: { name: ROLE_MAPPING[role] }
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
  
  return user;
}

// Función para establecer jerarquías
async function establishHierarchies(users, createdUsers) {
  const userMap = new Map();
  
  // Crear mapa de email a usuario
  for (const user of createdUsers) {
    userMap.set(user.email, user);
  }
  
  // Procesar jerarquías
  for (const userData of users) {
    const user = userMap.get(userData.email);
    if (!user) continue;
    
    // Buscar líder inmediato
    if (userData.liderInmediato) {
      const leaderEmail = userData.liderInmediato.toLowerCase().replace(/\s+/g, '') + '@gmail.com';
      const leader = userMap.get(leaderEmail);
      
      if (leader && leader.id !== user.id) {
        try {
          await prisma.userHierarchy.create({
            data: {
              parentId: leader.id,
              childId: user.id,
              role: 'DISCIPULO' // Por defecto, la relación es de discipulado
            }
          });
          console.log(`🔗 Jerarquía establecida: ${leader.profile.fullName} -> ${user.profile.fullName}`);
        } catch (error) {
          // La jerarquía ya existe, ignorar
          if (!error.message.includes('Unique constraint')) {
            console.log(`❌ Error estableciendo jerarquía para ${user.profile.fullName}:`, error.message);
          }
        }
      }
    }
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando script de creación de usuarios de prueba...');
    
    // Verificar que los permisos básicos existan
    const basicPermissions = ['READ_USERS', 'READ_PROFILE', 'WRITE_USERS', 'DELETE_USERS'];
    for (const permKey of basicPermissions) {
      const existingPerm = await prisma.permission.findUnique({
        where: { key: permKey }
      });
      
      if (!existingPerm) {
        await prisma.permission.create({
          data: { key: permKey }
        });
        console.log(`✅ Permiso ${permKey} creado`);
      }
    }
    
    // Asegurar que los roles existan
    await ensureRoles();
    
    // Parsear archivo de datos
    console.log('📖 Parseando archivo BBDD_Prueba.md...');
    const usersData = parseBBDDFile();
    console.log(`📊 Se encontraron ${usersData.length} usuarios válidos`);
    
    // Crear usuarios
    const createdUsers = [];
    for (const userData of usersData) {
      try {
        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email },
          include: { profile: true }
        });
        
        if (existingUser) {
          console.log(`⚠️  Usuario ${userData.email} ya existe, omitiendo...`);
          createdUsers.push(existingUser);
          continue;
        }
        
        const user = await createUserData(userData);
        createdUsers.push(user);
        console.log(`✅ Usuario creado: ${user.profile.fullName} (${user.email}) - Rol: ${userData.role}`);
      } catch (error) {
        console.log(`❌ Error creando usuario ${userData.email}:`, error.message);
      }
    }
    
    // Establecer jerarquías
    console.log('🔗 Estableciendo jerarquías...');
    await establishHierarchies(usersData, createdUsers);
    
    console.log('🎉 Script completado exitosamente!');
    console.log(`📈 Resumen:`);
    console.log(`   - Usuarios procesados: ${usersData.length}`);
    console.log(`   - Usuarios creados: ${createdUsers.filter(u => u).length}`);
    console.log(`   - Jerarquías establecidas`);
    
  } catch (error) {
    console.error('❌ Error en el script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  main();
}

module.exports = { main, parseBBDDFile };
