const EXPECTED_HEADERS = [
  'fullName', 'email', 'phone', 'sex', 'documentType', 'documentNumber',
  'birthDate', 'address', 'city', 'neighborhood', 'maritalStatus', 'network', 'role',
  'pastorEmail', 'liderDoceEmail', 'liderCelulaEmail',
];

const HEADER_LABELS = {
  fullName: 'Nombre Completo',
  email: 'Correo Electrónico',
  phone: 'Teléfono',
  sex: 'Sexo (HOMBRE/MUJER)',
  documentType: 'Tipo Documento (CC/CE/NIT/OTRO)',
  documentNumber: 'Número Documento',
  birthDate: 'Fecha Nacimiento (YYYY-MM-DD)',
  address: 'Dirección',
  city: 'Ciudad',
  neighborhood: 'Barrio',
  maritalStatus: 'Estado Civil (SOLTERO/CASADO/DIVORCIADO/VIUDO/UNION_LIBRE)',
  network: 'Red',
  role: 'Rol (DISCIPULO/LIDER_CELULA)',
  pastorEmail: 'Email del Pastor',
  liderDoceEmail: 'Email del Líder de 12',
  liderCelulaEmail: 'Email del Líder de Célula',
};

const VALID_SEX = ['HOMBRE', 'MUJER'];
const VALID_DOCUMENT_TYPES = ['CC', 'CE', 'NIT', 'OTRO'];
const VALID_MARITAL_STATUSES = ['SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNION_LIBRE', 'SEPARADO'];
const VALID_ROLES = ['DISCIPULO', 'LIDER_CELULA'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const validateExcelHeaders = (headers) => {
  if (!headers || headers.length === 0) {
    return { valid: false, error: 'El archivo Excel no contiene encabezados.' };
  }

  const firstCol = headers[0]?.trim();
  if (!firstCol || firstCol !== 'fullName') {
    return {
      valid: false,
      error: `La primera columna debe ser "Nombre Completo" (fullName). Columnas encontradas: ${headers.join(', ')}`,
    };
  }

  return { valid: true };
};

const validateRow = (row, rowIndex, userMap) => {
  const errors = [];

  const fullName = (row.fullName || '').trim();

  if (!fullName) {
    errors.push(`Fila ${rowIndex}: El nombre completo es obligatorio.`);
    return { valid: false, errors };
  }

  if (fullName.length < 3) {
    errors.push(`Fila ${rowIndex}: El nombre debe tener al menos 3 caracteres.`);
  }

  const email = (row.email || '').trim().toLowerCase();
  if (!email) {
    errors.push(`Fila ${rowIndex}: El correo electrónico es obligatorio.`);
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push(`Fila ${rowIndex}: El correo "${email}" no tiene un formato válido.`);
  } else if (userMap.email.has(email)) {
    errors.push(`Fila ${rowIndex}: El correo "${email}" ya está registrado en el sistema.`);
  }

  const phone = (row.phone || '').trim();
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.push(`Fila ${rowIndex}: El teléfono "${phone}" no tiene un formato válido.`);
  } else if (phone && userMap.phone.has(phone)) {
    errors.push(`Fila ${rowIndex}: El teléfono "${phone}" ya está registrado en el sistema.`);
  }

  const sex = (row.sex || '').trim().toUpperCase();
  if (sex && !VALID_SEX.includes(sex)) {
    errors.push(`Fila ${rowIndex}: El sexo debe ser HOMBRE o MUJER (recibido: "${row.sex}").`);
  }

  const documentType = (row.documentType || '').trim().toUpperCase();
  const documentNumber = (row.documentNumber || '').trim();
  if (documentType) {
    if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
      errors.push(`Fila ${rowIndex}: Tipo de documento inválido "${row.documentType}". Use: CC, CE, NIT u OTRO.`);
    }
    if (!documentNumber) {
      errors.push(`Fila ${rowIndex}: Si se especifica tipo de documento, el número es obligatorio.`);
    } else {
      const docKey = `${documentType}_${documentNumber}`;
      if (userMap.document.has(docKey)) {
        errors.push(`Fila ${rowIndex}: El documento ${documentType} ${documentNumber} ya está registrado.`);
      }
    }
  }

  const birthDate = (row.birthDate || '').trim();
  if (birthDate && !DATE_REGEX.test(birthDate)) {
    errors.push(`Fila ${rowIndex}: La fecha de nacimiento debe tener formato YYYY-MM-DD (recibido: "${row.birthDate}").`);
  }

  const maritalStatus = (row.maritalStatus || '').trim().toUpperCase();
  if (maritalStatus && !VALID_MARITAL_STATUSES.includes(maritalStatus)) {
    errors.push(`Fila ${rowIndex}: Estado civil inválido "${row.maritalStatus}".`);
  }

  const role = (row.role || '').trim().toUpperCase();
  if (role && !VALID_ROLES.includes(role)) {
    errors.push(`Fila ${rowIndex}: Rol inválido "${row.role}". Solo se permite DISCIPULO o LIDER_CELULA.`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  userMap.email.add(email);
  if (phone) userMap.phone.add(phone);
  if (documentType && documentNumber) {
    userMap.document.add(`${documentType}_${documentNumber}`);
  }

  return { valid: true, data: { fullName, email, phone, sex, documentType, documentNumber, birthDate, address: (row.address || '').trim(), city: (row.city || '').trim(), neighborhood: (row.neighborhood || '').trim(), maritalStatus, network: (row.network || '').trim().toUpperCase(), role, pastorEmail: (row.pastorEmail || '').trim().toLowerCase(), liderDoceEmail: (row.liderDoceEmail || '').trim().toLowerCase(), liderCelulaEmail: (row.liderCelulaEmail || '').trim().toLowerCase() } };
};

module.exports = { validateExcelHeaders, validateRow, HEADER_LABELS, EXPECTED_HEADERS };
