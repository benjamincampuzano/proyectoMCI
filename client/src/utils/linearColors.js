/**
 * Linear Color Utilities - Utilidades para colores dinámicos
 * Funciones para manipular colores del tema Linear con validación y transformación
 */

// Variables CSS del tema Linear
export const linearColors = {
  // Backgrounds
  backgrounds: {
    marketing: '#08090a',
    panel: '#0f1011',
    surface: '#191a1b',
    secondary: '#28282c'
  },
  
  // Text
  text: {
    primary: '#f7f8f8',
    secondary: '#d0d6e0',
    tertiary: '#8a8f98',
    quaternary: '#62666d'
  },
  
  // Brand & Accent
  brand: {
    indigo: '#5e6ad2',
    violet: '#7170ff',
    hover: '#828fff',
    lavender: '#7a7fad'
  },
  
  // Status
  status: {
    success: '#27a644',
    emerald: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#0ea5e9'
  },
  
  // Borders
  borders: {
    primary: '#23252a',
    secondary: '#34343a',
    tertiary: '#3e3e44',
    subtle: 'rgba(255,255,255,0.05)',
    standard: 'rgba(255,255,255,0.08)',
    lineTint: '#141516',
    lineTertiary: '#18191a'
  },
  
  // Overlay
  overlay: {
    primary: 'rgba(0,0,0,0.85)',
    secondary: 'rgba(0,0,0,0.5)',
    light: 'rgba(0,0,0,0.3)'
  },
  
  // Button backgrounds
  buttons: {
    ghost: 'rgba(255,255,255,0.02)',
    subtle: 'rgba(255,255,255,0.04)',
    hover: 'rgba(255,255,255,0.06)'
  }
};

// Obtener color por path con validación
export const getLinearColor = (path, fallback = '#000000') => {
  try {
    const keys = path.split('.');
    let color = linearColors;
    
    for (const key of keys) {
      if (color && typeof color === 'object' && key in color) {
        color = color[key];
      } else {
        return fallback;
      }
    }
    
    return color || fallback;
  } catch (error) {
    console.warn(`Invalid color path: ${path}`, error);
    return fallback;
  }
};

// Generar variaciones de opacidad
export const withOpacity = (color, opacity) => {
  if (typeof color !== 'string') return color;
  
  // Si ya es rgba, solo ajustar la opacidad
  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)\s*$/, `${opacity})`);
  }
  
  // Convertir hex a rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Generar variaciones de brillo
export const adjustBrightness = (color, amount) => {
  if (typeof color !== 'string') return color;
  
  // Convertir hex a RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Ajustar brillo
  const adjust = (value) => Math.max(0, Math.min(255, value + amount));
  
  const newR = adjust(r).toString(16).padStart(2, '0');
  const newG = adjust(g).toString(16).padStart(2, '0');
  const newB = adjust(b).toString(16).padStart(2, '0');
  
  return `#${newR}${newG}${newB}`;
};

// Mezclar dos colores
export const blendColors = (color1, color2, ratio = 0.5) => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  
  const newR = r.toString(16).padStart(2, '0');
  const newG = g.toString(16).padStart(2, '0');
  const newB = b.toString(16).padStart(2, '0');
  
  return `#${newR}${newG}${newB}`;
};

// Generar CSS variables dinámicas
export const generateCSSVariables = (customColors = {}) => {
  const mergedColors = { ...linearColors, ...customColors };
  const variables = {};
  
  const flattenColors = (obj, prefix = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      const varName = `--ln-${prefix}${key}`;
      
      if (typeof value === 'object') {
        flattenColors(value, `${prefix}${key}-`);
      } else {
        variables[varName] = value;
      }
    });
  };
  
  flattenColors(mergedColors);
  
  return variables;
};

// Aplicar colores al DOM
export const applyLinearTheme = (customColors = {}) => {
  const root = document.documentElement;
  const variables = generateCSSVariables(customColors);
  
  Object.entries(variables).forEach(([varName, value]) => {
    root.style.setProperty(varName, value);
  });
};

// Obtener color contrastante para texto
export const getContrastColor = (backgroundColor) => {
  if (!backgroundColor) return '#f7f8f8';
  
  // Convertir a RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  // Calcular luminancia
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  
  // Retornar blanco o negro según el contraste
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

// Paletas predefinidas
export const linearPalettes = {
  // Paleta principal
  primary: {
    background: linearColors.backgrounds.marketing,
    surface: linearColors.backgrounds.surface,
    text: linearColors.text.primary,
    accent: linearColors.brand.violet
  },
  
  // Paleta suave
  soft: {
    background: linearColors.backgrounds.surface,
    surface: linearColors.backgrounds.secondary,
    text: linearColors.text.secondary,
    accent: linearColors.brand.indigo
  },
  
  // Paleta de alto contraste
  highContrast: {
    background: '#000000',
    surface: '#1a1a1a',
    text: '#ffffff',
    accent: linearColors.brand.violet
  },
  
  // Paleta para datos
  data: {
    success: linearColors.status.emerald,
    warning: linearColors.status.warning,
    error: linearColors.status.error,
    info: linearColors.status.info
  }
};

// Utilidades para Tailwind
export const linearTailwindColors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712'
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16'
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03'
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a'
  }
};

// Validar color
export const isValidLinearColor = (color) => {
  if (typeof color !== 'string') return false;
  
  // Validar hex
  if (color.startsWith('#')) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}){1,2}$/.test(color);
  }
  
  // Validar rgba
  if (color.startsWith('rgba')) {
    return /^rgba\(\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*,\s*(\d?\.?\d+)\s*\)$/.test(color);
  }
  
  // Validar rgb
  if (color.startsWith('rgb')) {
    return /^rgb\(\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*\)$/.test(color);
  }
  
  return false;
};

export default {
  linearColors,
  getLinearColor,
  withOpacity,
  adjustBrightness,
  blendColors,
  generateCSSVariables,
  applyLinearTheme,
  getContrastColor,
  linearPalettes,
  linearTailwindColors,
  isValidLinearColor
};
