import React from 'react';

/**
 * Linear Icon System - Componentes de iconos optimizados
 * Con sprites, lazy loading y múltiples variantes
 */

// Cache de iconos cargados
const iconCache = new Map();

// Sprite sheet virtual (en producción usaría un sprite real)
const iconSprite = {
  // Iconos más comunes con sus paths SVG optimizados
  'arrow-right': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06 0L6.22 3.22Z'
  },
  'arrow-left': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 7.47a.75.75 0 0 1 0-1.06L9.78 12.78Z'
  },
  'arrow-up': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M7.47 12.78a.75.75 0 0 1-1.06 0L3.22 8.47a.75.75 0 0 1 0-1.06L7.47 12.78Z'
  },
  'arrow-down': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M8.53 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0-1.06L8.53 3.22Z'
  },
  'check': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M13.78 4.22a.75.75 0 0 1 0 1.06 0L6.47 12.53a.75.75 0 0 1-1.06 0L2.22 5.28a.75.75 0 0 1 1.06 0l10.5 10.5Z'
  },
  'x': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M4.22 4.22a.75.75 0 0 1 1.06 0L8 6.94l2.72 2.72a.75.75 0 0 1 1.06 0L11.78 4.22a.75.75 0 0 1 1.06 0L4.22 4.22ZM11.78 11.78a.75.75 0 0 1-1.06 0L8 9.06l-2.72 2.72a.75.75 0 0 1-1.06 0L2.22 11.78a.75.75 0 0 1 1.06 0l9.5 9.5Z'
  },
  'plus': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M8 3.5a.75.75 0 0 1 .75.75v2.25H5.75A.75.75 0 0 1 5 6.5v2.25a.75.75 0 0 1 .75.75H8v2.25a.75.75 0 0 1 .75.75.75.75h2.25a.75.75 0 0 1 .75-.75V8h2.25A.75.75 0 0 1 12 7.25.75.75.75H8Z'
  },
  'minus': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M3.5 8a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 .75.75.75.75h-8A.75.75 0 0 1 3.5 8Z'
  },
  'search': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M11.742 10.344a6.5 6.5 0 1 0-9.086 0 9.086 6.5 6.5 0 0 0 9.086 0l1.75 1.75a1 1 0 0 1 1.414 0l4.242 4.243a1 1 0 0 1 1.415 0l1.75-1.75a1 1 0 0 1 0-1.415ZM2.344 8.5a6.5 6.5 0 1 0 9.086 0c0 1.61.593 3.094 1.598 4.233.406 1.598 1.094 3.094.593 1.61 0 0-9.086 0Z'
  },
  'settings': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M8 2.25a.75.75 0 0 1 .75-.75H7.25A.75.75 0 0 1 6.5 3v1a.75.75 0 0 1 .75.75h1.5a.75.75 0 0 1 .75-.75V3ZM6.5 6.75A.75.75 0 0 1 5.75 7.5v1a.75.75 0 0 1 .75.75h4.5a.75.75 0 0 1 .75-.75v-1a.75.75 0 0 1-.75-.75H6.5ZM6.5 11.25a.75.75 0 0 1 .75.75v1a.75.75 0 0 1 .75.75h4.5a.75.75 0 0 1 .75-.75v-1a.75.75 0 0 1-.75-.75H6.5Z'
  },
  'home': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M8.707 1.293a1 1 0 0 0-1.414 0L2.586 7a1 1 0 0 0 0 1.414v6a1 1 0 0 0 1 1.414l4.707 4.707a1 1 0 0 0 1.414 0l-4.707-4.707a1 1 0 0 0-1.414 0V8a1 1 0 0 0-1.414Z'
  },
  'user': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M8 8a3 3 0 1 0 0 3-3 3 3 0 0 0-3 3Zm3.5-1a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h7ZM11.5 14a.5.5 0 0 1-.5.5v-1a.5.5 0 0 1 1-1h1a.5.5 0 0 1 1 1v1a.5.5 0 0 1-.5.5ZM4.5 14a.5.5 0 0 1-.5.5v-1a.5.5 0 0 1 1-1h-1a.5.5 0 0 1 1 1v1a.5.5 0 0 1-.5.5Z'
  },
  'calendar': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M4.75 2a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-.75.75H5.5A.75.75 0 0 1 4.75 3.75v-1.5ZM2.5 6.5a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-.75.75H3.25A.75.75 0 0 1 2.5 6.5v6.5Z'
  },
  'clock': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M8 14.5a.75.75 0 0 1 .75-.75V8a.75.75 0 0 1 .75-.75V4.5a.75.75 0 0 1 .75-.75V2a.75.75 0 0 1 .75-.75V1.25a.75.75 0 0 1-.75-.75V2ZM8 1.5a.75.75 0 0 1 .75-.75V3a.75.75 0 0 1 .75.75.75.75H8.75A.75.75 0 0 1 8 4.5V2a.75.75 0 0 1 .75-.75V1.5ZM8 11.25a.75.75 0 0 1 .75-.75V8a.75.75 0 0 1 .75-.75V1.25a.75.75 0 0 1 .75-.75V2a.75.75 0 0 1 .75.75.75.75H8.75A.75.75 0 0 1 8 4.5V3a.75.75 0 0 1 .75-.75V2a.75.75 0 0 1 .75-.75V1.25Z'
  },
  'info': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M8 2.5A5.5 5.5 0 1 0 0 11 0 5.5 5.5 0 0 0 0 11ZM8 5.5a1 1 0 1 0 1 2 0 1 1 0 0 1-2 0ZM8 12.5a.75.75 0 0 1 .75-.75V8a.75.75 0 0 1 .75-.75H7.25A.75.75 0 0 1 6.5 8.75v3.75a.75.75 0 0 1 .75.75H8Z'
  },
  'warning': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M8.5 1.5A1.5 1.5 0 0 0 7 0v4.5a1.5 1.5 0 0 0 3 0h.5a1.5 1.5 0 0 0 3 0v4.5a1.5 1.5 0 0 0-3 0H8.5ZM8 14.25a.75.75 0 0 1 .75-.75V8a.75.75 0 0 1 .75-.75H7.25A.75.75 0 0 1 6.5 8.75v3.75a.75.75 0 0 1 .75.75H8Z'
  },
  'error': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M8 2.5A5.5 5.5 0 0 0 0 11 0 5.5 5.5 0 0 0 0 11ZM8 5.5a1 1 0 1 0 1 2 0 1 1 0 0 1-2 0ZM8.5 10.5a.75.75 0 0 1 .75-.75V8a.75.75 0 0 1 .75-.75H7.25A.75.75 0 0 1 6.5 8.75v3.75a.75.75 0 0 1 .75.75H8.5Z'
  },
  'loading': {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    path: 'M8 2a1 1 0 0 1 1 0v12a1 1 0 1 1-1 0V2ZM10 8a1 1 0 1 1-1 0v12a1 1 0 1 1-1 0V8Z'
  }
};

// Componente Icon principal
const Icon = ({ 
  name, 
  size = 'default', 
  color = 'currentColor', 
  className = '', 
  ...props 
}) => {
  const iconData = iconSprite[name];
  
  if (!iconData) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    default: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
    '2xl': 'w-12 h-12'
  };

  return (
    <svg
      width={iconData.width}
      height={iconData.height}
      viewBox={iconData.viewBox}
      fill={color}
      className={`${sizeClasses[size]} ${className}`}
      {...props}
    >
      <path d={iconData.path} />
    </svg>
  );
};

// Icon Component con loading lazy
export const LazyIcon = ({ 
  name, 
  size = 'default', 
  color = 'currentColor', 
  className = '', 
  fallback = null,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    // Simular carga lazy
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, Math.random() * 100 + 50); // Simular variable load time

    return () => clearTimeout(timer);
  }, [name]);

  if (hasError && fallback) {
    return fallback;
  }

  const iconData = iconSprite[name];
  
  if (!iconData) {
    return <Icon name="info" size={size} color={color} className={className} {...props} />;
  }

  return (
    <div className={`inline-block ${!isLoaded ? 'animate-pulse' : ''}`}>
      {isLoaded ? (
        <svg
          width={iconData.width}
          height={iconData.height}
          viewBox={iconData.viewBox}
          fill={color}
          className={`${size === 'default' ? 'w-5 h-5' : ''} ${className}`}
          {...props}
        >
          <path d={iconData.path} />
        </svg>
      ) : (
        // Placeholder mientras carga
        <div className={`w-5 h-5 bg-[rgba(255,255,255,0.05)] rounded animate-pulse`} />
      )}
    </div>
  );
};

// Icon Button Component
export const IconButton = ({ 
  icon, 
  size = 'default', 
  variant = 'ghost', 
  color = 'currentColor', 
  disabled = false, 
  onClick, 
  className = '', 
  children, 
  ...props 
}) => {
  const variantClasses = {
    ghost: 'bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]',
    subtle: 'bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.06)] border-transparent',
    primary: 'bg-[var(--ln-accent-violet)] hover:bg-[var(--ln-accent-hover)] text-white border-transparent',
    danger: 'bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.2)] text-[#ef4444] border-[rgba(239,68,68,0.2)]'
  };

  const sizeClasses = {
    sm: 'p-1.5',
    default: 'p-2',
    md: 'p-2.5',
    lg: 'p-3'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center rounded-lg transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
        ${className}
      `}
      {...props}
    >
      <Icon name={icon} size={size} color={color} />
      {children && <span className="ml-2">{children}</span>}
    </button>
  );
};

// Icon Badge Component
export const IconBadge = ({ 
  icon, 
  badge, 
  size = 'default', 
  color = 'currentColor', 
  badgeColor = '#ef4444', 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`relative inline-block ${className}`} {...props}>
      <Icon name={icon} size={size} color={color} />
      {badge && (
        <span 
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs font-[590] text-white flex items-center justify-center"
          style={{ backgroundColor: badgeColor }}
        >
          {badge}
        </span>
      )}
    </div>
  );
};

// Icon Stack Component
export const IconStack = ({ 
  icons, 
  size = 'default', 
  spacing = 'tight', 
  className = '', 
  ...props 
}) => {
  const spacingClasses = {
    none: '',
    tight: '-space-x-1',
    normal: '-space-x-2',
    loose: '-space-x-3'
  };

  return (
    <div className={`flex items-center ${spacingClasses[spacing]} ${className}`} {...props}>
      {icons.map((iconName, index) => (
        <Icon 
          key={index}
          name={iconName} 
          size={size} 
        />
      ))}
    </div>
  );
};

// Utilidades para iconos
export const iconUtils = {
  // Obtener todos los nombres de iconos disponibles
  getAvailableIcons: () => Object.keys(iconSprite),
  
  // Verificar si un icono existe
  hasIcon: (name) => name in iconSprite,
  
  // Obtener dimensiones de un icono
  getIconSize: (name) => {
    const icon = iconSprite[name];
    return icon ? { width: icon.width, height: icon.height } : null;
  },
  
  // Limpiar cache
  clearCache: () => iconCache.clear(),
  
  // Pre-cargar iconos
  preloadIcons: (iconNames) => {
    iconNames.forEach(name => {
      if (!iconCache.has(name)) {
        iconCache.set(name, true);
        // En producción, esto precargaría los SVG del sprite
      }
    });
  }
};

export default Icon;
