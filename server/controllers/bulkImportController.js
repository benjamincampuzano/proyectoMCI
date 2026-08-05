const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const prisma = require('../utils/database');
const { logActivity } = require('../utils/auditLogger');
const { generateTempPassword } = require('../utils/passwordGenerator');
const { validateExcelHeaders, validateRow, HEADER_LABELS } = require('../utils/excelValidator');
const { checkCycle } = require('../utils/networkUtils');

const downloadTemplate = (req, res) => {
  const wb = XLSX.utils.book_new();

  const wsData = [
    Object.keys(HEADER_LABELS).map(k => HEADER_LABELS[k]),
    [
      'Juan Pérez', 'juan@ejemplo.com', '3001234567', 'HOMBRE', 'CC', '12345678',
      '1990-05-15', 'Calle 123 #45-67', 'Bogotá', 'Centro', 'CASADO', 'ROJA',
      'DISCIPULO', 'pastor@iglesia.com', 'lider12@iglesia.com', '',
    ],
    [
      'María López', 'maria@ejemplo.com', '3007654321', 'MUJER', 'CE', '87654321',
      '1995-08-20', 'Av 456 #78-90', 'Medellín', 'Poblado', 'SOLTERO', 'AZUL',
      'LIDER_CELULA', 'pastor@iglesia.com', '', '',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 10 },
    { wch: 18 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');

  const notas = [
    ['NOTAS IMPORTANTES:'],
    ['- fullName (Nombre Completo): Obligatorio. Mínimo 3 caracteres.'],
    ['- email (Correo Electrónico): Obligatorio. Debe ser único en el sistema.'],
    ['- phone (Teléfono): Opcional. Debe ser único si se proporciona.'],
    ['- sex (Sexo): Opcional. Usar HOMBRE o MUJER.'],
    ['- documentType (Tipo Documento): Opcional. Usar CC, CE, NIT u OTRO.'],
    ['- documentNumber (Número Documento): Opcional. Obligatorio si documentType está presente.'],
    ['- birthDate (Fecha Nacimiento): Opcional. Formato YYYY-MM-DD.'],
    ['- maritalStatus (Estado Civil): Opcional. SOLTERO, CASADO, DIVORCIADO, VIUDO, UNION_LIBRE.'],
    ['- role (Rol): Opcional. Por defecto DISCIPULO. Solo DISCIPULO o LIDER_CELULA.'],
    ['- pastorEmail / liderDoceEmail / liderCelulaEmail: Opcional. Email del líder para asignación jerárquica. Debe existir en el sistema.'],
    ['- Las contraseñas se generan automáticamente. Los usuarios deberán cambiarla al iniciar sesión.'],
  ];

  const wsNotas = XLSX.utils.aoa_to_sheet(notas);
  wsNotas['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsNotas, 'Notas');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=plantilla_importacion_usuarios.xlsx');
  res.send(buffer);
};

const bulkImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Debe subir un archivo Excel.' });
    }

    const workbook = XLSX.readFile(req.file.path, { type: 'file' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ message: 'El archivo Excel no contiene datos.' });
    }

    const headers = Object.keys(jsonData[0]);
    const headerCheck = validateExcelHeaders(headers);
    if (!headerCheck.valid) {
      return res.status(400).json({ message: headerCheck.error });
    }

    const existingUsers = await prisma.user.findMany({
      where: { isDeleted: false },
      select: { email: true, phone: true, profile: { select: { documentType: true, documentNumber: true } } },
    });

    const userMap = {
      email: new Set(existingUsers.map(u => u.email.toLowerCase())),
      phone: new Set(existingUsers.map(u => u.phone).filter(Boolean)),
      document: new Set(
        existingUsers
          .filter(u => u.profile?.documentType && u.profile?.documentNumber)
          .map(u => `${u.profile.documentType}_${u.profile.documentNumber}`)
      ),
    };

    const validRows = [];
    const allErrors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const result = validateRow(jsonData[i], i + 2, userMap);
      if (result.valid) {
        validRows.push(result.data);
      } else {
        allErrors.push(...result.errors);
      }
    }

    if (validRows.length === 0) {
      return res.status(400).json({
        message: 'No se encontraron filas válidas para importar.',
        errors: allErrors,
        total: jsonData.length,
        successCount: 0,
        errorCount: allErrors.length,
      });
    }

    const leaderEmails = new Set();
    validRows.forEach(row => {
      if (row.pastorEmail) leaderEmails.add(row.pastorEmail);
      if (row.liderDoceEmail) leaderEmails.add(row.liderDoceEmail);
      if (row.liderCelulaEmail) leaderEmails.add(row.liderCelulaEmail);
    });

    let leaderMap = {};
    let leaderRolesMap = {};
    let leaderSpouseMap = {};
    if (leaderEmails.size > 0) {
      const leaders = await prisma.user.findMany({
        where: { email: { in: Array.from(leaderEmails) }, isDeleted: false },
        select: {
          id: true,
          email: true,
          spouseId: true,
          roles: { include: { role: true } },
        },
      });
      leaderMap = Object.fromEntries(leaders.map(l => [l.email.toLowerCase(), l.id]));
      leaderRolesMap = Object.fromEntries(leaders.map(l => [l.email.toLowerCase(), l.roles.map(r => r.role.name)]));
      leaderSpouseMap = Object.fromEntries(leaders.map(l => [l.email.toLowerCase(), l.spouseId]));

      const missingLeaders = Array.from(leaderEmails).filter(e => !leaderMap[e]);
      if (missingLeaders.length > 0) {
        return res.status(400).json({
          message: `Los siguientes líderes no existen en el sistema: ${missingLeaders.join(', ')}`,
          errors: missingLeaders.map(e => `El líder con email "${e}" no fue encontrado en el sistema.`),
          total: jsonData.length,
          successCount: 0,
          errorCount: missingLeaders.length,
        });
      }
    }

    const hashedPassword = await bcrypt.hash(generateTempPassword(), 10);

    const createdUsers = [];
    const createErrors = [];

    for (const row of validRows) {
      try {
        const user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email: row.email,
              password: hashedPassword,
              phone: row.phone || null,
              mustChangePassword: true,
              profile: {
                create: {
                  fullName: row.fullName,
                  sex: row.sex || null,
                  documentType: row.documentType || null,
                  documentNumber: row.documentNumber || null,
                  birthDate: row.birthDate ? new Date(row.birthDate) : null,
                  address: row.address || null,
                  city: row.city || null,
                  neighborhood: row.neighborhood || null,
                  maritalStatus: row.maritalStatus || null,
                  network: row.network || null,
                },
              },
            },
            include: { profile: true },
          });

          const targetRole = await tx.role.upsert({
            where: { name: row.role || 'DISCIPULO' },
            update: {},
            create: { name: row.role || 'DISCIPULO' },
          });

          await tx.userRole.create({ data: { userId: newUser.id, roleId: targetRole.id } });

          const hierarchyEntries = [
            { email: row.pastorEmail, role: 'PASTOR' },
            { email: row.liderDoceEmail, role: 'LIDER_DOCE' },
            { email: row.liderCelulaEmail, role: 'LIDER_CELULA' },
          ];

          for (const entry of hierarchyEntries) {
            if (entry.email && leaderMap[entry.email]) {
              const parentId = leaderMap[entry.email];

              if (parentId === newUser.id) {
                console.warn(`[bulk-import] Skip ${entry.role} parent=${parentId} for child=${newUser.id}: self-assignment`);
                continue;
              }
              if (leaderSpouseMap[entry.email] === newUser.id) {
                console.warn(`[bulk-import] Skip ${entry.role} parent=${parentId} for child=${newUser.id}: spouse cannot be leader`);
                continue;
              }
              if (await checkCycle(newUser.id, parentId)) {
                console.warn(`[bulk-import] Skip ${entry.role} parent=${parentId} for child=${newUser.id}: would create cycle`);
                continue;
              }
              const leaderRoles = leaderRolesMap[entry.email] || [];
              const spouseHasRole = leaderSpouseMap[entry.email]
                ? await prisma.userRole.findFirst({ where: { userId: leaderSpouseMap[entry.email], role: { name: entry.role } } })
                : null;
              if (['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(entry.role) && !leaderRoles.includes(entry.role) && !spouseHasRole) {
                console.warn(`[bulk-import] Skip ${entry.role} parent=${parentId} for child=${newUser.id}: leader lacks role ${entry.role}`);
                continue;
              }

              await tx.userHierarchy.create({
                data: {
                  parentId,
                  childId: newUser.id,
                  role: entry.role,
                },
              });
            }
          }

          return newUser;
        });

        createdUsers.push({ id: user.id, email: user.email, fullName: row.fullName });
      } catch (err) {
        createErrors.push({
          row: row.fullName || row.email,
          error: err.message,
        });
      }
    }

    await logActivity(req.user.id, 'CREATE', 'USER', null, {
      action: 'BULK_IMPORT',
      successCount: createdUsers.length,
      errorCount: createErrors.length,
      totalRows: jsonData.length,
      createdUsers: createdUsers.map(u => ({ id: u.id, email: u.email })),
      errors: createErrors.length > 0 ? createErrors : undefined,
    }, req.ip, req.headers['user-agent']);

    const response = {
      message: `Importación completada. ${createdUsers.length} usuarios creados exitosamente.`,
      successCount: createdUsers.length,
      errorCount: allErrors.length + createErrors.length,
      total: jsonData.length,
    };

    if (allErrors.length > 0 || createErrors.length > 0) {
      response.warning = 'Algunas filas no pudieron ser procesadas.';
      response.validationErrors = allErrors.length > 0 ? allErrors : undefined;
      response.createErrors = createErrors.length > 0 ? createErrors : undefined;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({ message: 'Error del servidor al procesar la importación.' });
  }
};

module.exports = { downloadTemplate, bulkImport };
