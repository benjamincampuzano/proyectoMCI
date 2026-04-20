/**
 * Module name constants for frontend use
 * Matches server constants in server/utils/moduleConstants.js
 */

export const MODULES = {
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
export const VALID_MODULES = Object.values(MODULES);

/**
 * Display names for UI
 */
export const MODULE_DISPLAY_NAMES = {
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
 * Normalize module name for consistency (lowercase, hyphenated)
 */
export const normalizeModuleName = (name) => {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, '-');
};

/**
 * Check if a module name is valid
 */
export const isValidModule = (moduleName) => {
  if (!moduleName) return false;
  const normalized = normalizeModuleName(moduleName);
  return VALID_MODULES.includes(normalized);
};
