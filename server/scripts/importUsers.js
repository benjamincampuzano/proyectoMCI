const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Función para parsear la fecha de nacimiento
function parseBirthDate(dateString) {
  if (!dateString) return null;
  
  // Manejar diferentes formatos de fecha
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/,  // DD-MM-YYYY
  ];
  
  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      const [, day, month, year] = match;
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
  }
  
  return null;
}

// Función para determinar el género basado en el nombre
function determineSex(name) {
  const femaleNames = [
    'Yessica', 'Macaria', 'Ambar', 'Eulalia', 'Florentina', 'Felisa', 'Odalys', 
    'Isaura', 'Esperanza', 'Violeta', 'Eva', 'Elba', 'Morena', 'Nidia', 'Adoracion',
    'Aranzazu', 'Florinda', 'Javiera', 'Angelina', 'Encarnacion', 'Georgina',
    'Concepcion', 'Saturnina', 'Visitacion', 'Bernardita', 'Andrea', 'Magdalena',
    'Delfina', 'Amalia', 'Evita', 'Brunilda', 'Lupita', 'Marisa', 'Daniela',
    'Selena', 'Dulce', 'Benita', 'Mirta', 'Pili', 'Begoña', 'Alejandra', 'Carla',
    'Maria', 'Apolonia', 'Chelo', 'Graciana', 'Barbara', 'Crescencia', 'Kike',
    'Aurelia', 'Blanca', 'Consuela', 'Tatiana', 'Candelaria', 'Jacinta', 'Cruz',
    'Ana', 'Macarena', 'Nayara', 'Paloma', 'Clarisa', 'Carmelita', 'Casandra',
    'Bienvenida', 'Jessica', 'Renata', 'Florinda', 'Esmeralda', 'Adriana'
  ];
  
  const firstName = name.split(' ')[0];
  return femaleNames.includes(firstName) ? 'MUJER' : 'HOMBRE';
}

// Función para limpiar el número de documento
function cleanDocumentNumber(docNumber) {
  if (!docNumber) return null;
  return docNumber.toString().trim();
}

// Función para hashear la contraseña
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Función para parsear el archivo markdown
function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const users = [];
  let isParsing = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Saltar la cabecera
    if (line.includes('Nombre Completo') || line.includes('---')) {
      isParsing = true;
      continue;
    }
    
    if (!isParsing || line === '') continue;
    
    // Parsear la línea usando regex
    const regex = /\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/;
    const match = line.match(regex);
    
    if (match) {
      const [
        , nombreCompleto, cc, fechaNacimiento, correo, contraseña, 
        rol, telefono, direccion, ciudad, liderInmediato, lider12
      ] = match;
      
      users.push({
        fullName: nombreCompleto.trim(),
        documentNumber: cleanDocumentNumber(cc.trim()),
        birthDate: parseBirthDate(fechaNacimiento.trim()),
        email: correo.trim().toLowerCase(),
        password: contraseña.trim(),
        role: rol.trim(),
        phone: telefono.trim(),
        address: direccion.trim(),
        city: ciudad.trim(),
        immediateLeader: liderInmediato.trim(),
        leader12: lider12.trim()
      });
    }
  }
  
  return users;
}

// Función para mapear roles del archivo a roles del sistema
function mapRole(fileRole) {
  const roleMap = {
    'LIDER_CELULA': 'LIDER_CELULA',
    'DISCIPULO': 'DISCIPULO'
  };
  
  return roleMap[fileRole] || 'DISCIPULO';
}

// Función principal de importación
async function importUsers() {
  try {
    console.log('Iniciando importación de usuarios...');
    
    // Parsear el archivo
    const filePath = path.join(__dirname, 'BBDD_Prueba.md');
    const usersData = parseMarkdownFile(filePath);
    
    console.log(`Se encontraron ${usersData.length} usuarios para importar`);
    
    // Crear un mapa para referencia rápida de usuarios por nombre
    const userMap = new Map();
    
    // Primero, crear todos los usuarios y sus perfiles
    for (const userData of usersData) {
      try {
        // Hashear la contraseña
        const hashedPassword = await hashPassword(userData.password);
        
        // Crear el usuario
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            phone: userData.phone || null,
            password: hashedPassword,
            isActive: true,
            isDeleted: false,
            mustChangePassword: false,
            isCoordinator: false,
            profile: {
              create: {
                fullName: userData.fullName,
                sex: determineSex(userData.fullName),
                documentType: 'CC',
                documentNumber: userData.documentNumber,
                birthDate: userData.birthDate,
                address: userData.address,
                city: userData.city,
                dataPolicyAccepted: true,
                dataTreatmentAuthorized: true,
                minorConsentAuthorized: false,
                maritalStatus: null,
                network: null,
                neighborhood: null
              }
            }
          },
          include: {
            profile: true
          }
        });
        
        userMap.set(userData.fullName, user);
        console.log(`✓ Usuario creado: ${userData.fullName} (${userData.email})`);
        
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠ Usuario ya existe: ${userData.email}`);
          // Obtener el usuario existente
          const existingUser = await prisma.user.findUnique({
            where: { email: userData.email },
            include: { profile: true }
          });
          if (existingUser) {
            userMap.set(userData.fullName, existingUser);
          }
        } else {
          console.error(`✗ Error creando usuario ${userData.fullName}:`, error.message);
        }
      }
    }
    
    console.log('\nCreando relaciones jerárquicas...');
    
    // Ahora crear las relaciones jerárquicas
    for (const userData of usersData) {
      const user = userMap.get(userData.fullName);
      if (!user) continue;
      
      // Buscar al líder inmediato
      if (userData.immediateLeader && userData.immediateLeader !== userData.fullName) {
        const leader = userMap.get(userData.immediateLeader);
        if (leader) {
          try {
            await prisma.userHierarchy.create({
              data: {
                parentId: leader.id,
                childId: user.id,
                role: mapRole(userData.role)
              }
            });
            console.log(`✓ Relación creada: ${userData.fullName} -> ${userData.immediateLeader}`);
          } catch (error) {
            if (error.code !== 'P2002') { // Ignorar duplicados
              console.error(`✗ Error creando relación jerárquica:`, error.message);
            }
          }
        }
      }
    }
    
    // Asignar roles a los usuarios
    console.log('\nAsignando roles del sistema...');
    
    // Obtener o crear los roles necesarios
    const roles = await Promise.all([
      prisma.role.upsert({
        where: { name: 'LIDER_CELULA' },
        update: {},
        create: { name: 'LIDER_CELULA' }
      }),
      prisma.role.upsert({
        where: { name: 'DISCIPULO' },
        update: {},
        create: { name: 'DISCIPULO' }
      })
    ]);
    
    const roleMap = {
      'LIDER_CELULA': roles[0],
      'DISCIPULO': roles[1]
    };
    
    // Asignar roles a cada usuario
    for (const userData of usersData) {
      const user = userMap.get(userData.fullName);
      if (!user) continue;
      
      const systemRole = roleMap[mapRole(userData.role)];
      if (systemRole) {
        try {
          await prisma.userRole.create({
            data: {
              userId: user.id,
              roleId: systemRole.id
            }
          });
          console.log(`✓ Rol asignado: ${userData.fullName} -> ${userData.role}`);
        } catch (error) {
          if (error.code !== 'P2002') { // Ignorar duplicados
            console.error(`✗ Error asignando rol:`, error.message);
          }
        }
      }
    }
    
    console.log('\n✅ Importación completada exitosamente');
    console.log(`📊 Estadísticas:`);
    console.log(`   - Usuarios procesados: ${usersData.length}`);
    console.log(`   - Usuarios creados: ${userMap.size}`);
    console.log(`   - Líderes de célula: ${usersData.filter(u => u.role === 'LIDER_CELULA').length}`);
    console.log(`   - Discípulos: ${usersData.filter(u => u.role === 'DISCIPULO').length}`);
    
  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la importación
if (require.main === module) {
  importUsers();
}

module.exports = { importUsers };
