/**
 * Centralized module name constants to avoid magic strings
 * Used for module coordinator permissions and routing
 */

const MODULES = {
  GANAR: 'ganar',
  CONSOLIDAR: 'consolidar',
  ENVIAR: 'enviar',
  DISCIPULAR: 'discipular',
  KIDS: 'kids',
  CONVENCIONES: 'convenciones',
  ENCUENTROS: 'encuentros',
  ARTES: 'escuela-de-artes',
};

/**
 * Array of all valid module names
 */
const VALID_MODULES = Object.values(MODULES);

/**
 * Check if a module name is valid
 * @param {string} moduleName - Module name to validate
 * @returns {boolean} - True if valid module
 */
const isValidModule = (moduleName) => {
  if (!moduleName) return false;
  const normalized = moduleName.toLowerCase().trim().replace(/\s+/g, '-');
  return VALID_MODULES.includes(normalized);
};

/**
 * Normalize module name for consistency
 * @param {string} name - Module name to normalize
 * @returns {string} - Normalized module name (lowercase, hyphenated)
 */
const normalizeModuleName = (name) => {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, '-');
};

/**
 * Get display name for a module
 */
const MODULE_DISPLAY_NAMES = {
  [MODULES.GANAR]: 'Ganar',
  [MODULES.CONSOLIDAR]: 'Consolidar',
  [MODULES.ENVIAR]: 'Enviar',
  [MODULES.DISCIPLAR]: 'Discipular',
  [MODULES.KIDS]: 'Kids',
  [MODULES.CONVENCIONES]: 'Convenciones',
  [MODULES.ENCUENTROS]: 'Encuentros',
  [MODULES.ARTES]: 'Escuela de Artes',
};

/**
 * Get network associated with a module (for validation)
 */
const MODULE_NETWORK_MAP = {
  [MODULES.GANAR]: 'HOMBRES',
  [MODULES.CONSOLIDAR]: 'HOMBRES',
  [MODULES.ENVIAR]: 'HOMBRES',
  [MODULES.DISCIPLAR]: 'HOMBRES',
  [MODULES.KIDS]: 'KIDS',
};

module.exports = {
  MODULES,
  VALID_MODULES,
  isValidModule,
  normalizeModuleName,
  MODULE_DISPLAY_NAMES,
  MODULE_NETWORK_MAP,
};
