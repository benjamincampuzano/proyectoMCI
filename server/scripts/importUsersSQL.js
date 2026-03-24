const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuración de la base de datos desde variables de entorno
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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
  const client = await pool.connect();
  
  try {
    console.log('Iniciando importación de usuarios...');
    
    // Parsear el archivo
    const filePath = path.join(__dirname, '../../BBDD_Prueba.md');
    const usersData = parseMarkdownFile(filePath);
    
    console.log(`Se encontraron ${usersData.length} usuarios para importar`);
    
    // Crear un mapa para referencia rápida de usuarios por nombre
    const userMap = new Map();
    
    // Primero, crear todos los usuarios y sus perfiles
    for (const userData of usersData) {
      try {
        // Hashear la contraseña
        const hashedPassword = await hashPassword(userData.password);
        
        // Verificar si el usuario ya existe
        const existingUser = await client.query(
          'SELECT u.*, p."fullName" FROM "User" u LEFT JOIN "UserProfile" p ON u.id = p."userId" WHERE u.email = $1',
          [userData.email]
        );
        
        if (existingUser.rows.length > 0) {
          console.log(`⚠ Usuario ya existe: ${userData.email}`);
          userMap.set(userData.fullName, existingUser.rows[0]);
          continue;
        }
        
        // Iniciar transacción
        await client.query('BEGIN');
        
        // Crear el usuario
        const userResult = await client.query(
          `INSERT INTO "User" (email, phone, password, "isActive", "isDeleted", "mustChangePassword", "isCoordinator", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING id, email`,
          [
            userData.email,
            userData.phone || null,
            hashedPassword,
            true,
            false,
            false,
            false
          ]
        );
        
        const user = userResult.rows[0];
        
        // Crear el perfil
        await client.query(
          `INSERT INTO "UserProfile" ("userId", "fullName", sex, "documentType", "documentNumber", "birthDate", address, city, "dataPolicyAccepted", "dataTreatmentAuthorized", "minorConsentAuthorized")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            user.id,
            userData.fullName,
            determineSex(userData.fullName),
            'CC',
            userData.documentNumber,
            userData.birthDate,
            userData.address,
            userData.city,
            true,
            true,
            false
          ]
        );
        
        await client.query('COMMIT');
        
        // Obtener el usuario completo con perfil
        const completeUser = await client.query(
          'SELECT u.*, p."fullName" FROM "User" u LEFT JOIN "UserProfile" p ON u.id = p."userId" WHERE u.id = $1',
          [user.id]
        );
        
        userMap.set(userData.fullName, completeUser.rows[0]);
        console.log(`✓ Usuario creado: ${userData.fullName} (${userData.email})`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ Error creando usuario ${userData.fullName}:`, error.message);
      }
    }
    
    console.log('\nCreando roles del sistema...');
    
    // Crear roles si no existen
    await client.query(`
      INSERT INTO "Role" (name) VALUES ('LIDER_CELULA'), ('DISCIPULO')
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Obtener los roles
    const rolesResult = await client.query('SELECT * FROM "Role" WHERE name IN ($1, $2)', ['LIDER_CELULA', 'DISCIPULO']);
    const roles = rolesResult.rows;
    
    const roleMap = {
      'LIDER_CELULA': roles.find(r => r.name === 'LIDER_CELULA'),
      'DISCIPULO': roles.find(r => r.name === 'DISCIPULO')
    };
    
    console.log('\nAsignando roles a usuarios...');
    
    // Asignar roles a cada usuario
    for (const userData of usersData) {
      const user = userMap.get(userData.fullName);
      if (!user) continue;
      
      const systemRole = roleMap[mapRole(userData.role)];
      if (systemRole) {
        try {
          await client.query(
            'INSERT INTO "UserRole" ("userId", "roleId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [user.id, systemRole.id]
          );
          console.log(`✓ Rol asignado: ${userData.fullName} -> ${userData.role}`);
        } catch (error) {
          console.error(`✗ Error asignando rol:`, error.message);
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
            await client.query(
              `INSERT INTO "UserHierarchy" ("parentId", "childId", role, "createdAt")
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT ("parentId", "childId", role) DO NOTHING`,
              [leader.id, user.id, mapRole(userData.role)]
            );
            console.log(`✓ Relación creada: ${userData.fullName} -> ${userData.immediateLeader}`);
          } catch (error) {
            console.error(`✗ Error creando relación jerárquica:`, error.message);
          }
        } else {
          console.log(`⚠ Líder no encontrado: ${userData.immediateLeader} para ${userData.fullName}`);
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
    client.release();
    await pool.end();
  }
}

// Ejecutar la importación
if (require.main === module) {
  importUsers();
}

module.exports = { importUsers };
