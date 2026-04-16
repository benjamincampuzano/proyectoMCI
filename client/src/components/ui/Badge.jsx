import React from 'react';
import { X } from '@phosphor-icons/react';

/**
 * Badge/Pill System - Estilo Linear completo
 * Success, neutral, subtle variants con estilos consistentes
 */

const Badge = ({ 
  children, 
  variant = 'neutral', 
  size = 'default', 
  removable = false, 
  onRemove, 
  className = '', 
  ...props 
}) => {
  const variantClasses = {
    // Success Pill - para estados activos/completados
    success: 'bg-[#10b981] text-white border-transparent',
    
    // Emerald - para estados de completado secundarios
    emerald: 'bg-[#10b981] text-white border-transparent',
    
    // Neutral Pill - para tags y categorías
    neutral: 'bg-transparent text-[#d0d6e0] border border-[rgb(35,37,42)]',
    
    // Subtle Badge - para labels inline
    subtle: 'bg-[rgba(255,255,255,0.05)] text-[#f7f8f8] border border-[rgba(255,255,255,0.05)]',
    
    // Primary - para elementos importantes
    primary: 'bg-[var(--ln-brand-indigo)] text-white border-transparent',
    
    // Accent - para elementos interactivos
    accent: 'bg-[var(--ln-accent-violet)] text-white border-transparent',
    
    // Warning - para advertencias
    warning: 'bg-[#f59e0b] text-white border-transparent',
    
    // Error - para errores
    error: 'bg-[#ef4444] text-white border-transparent',
    
    // Info - para información
    info: 'bg-[#0ea5e9] text-white border-transparent',
    
    // Security - para elementos de seguridad
    security: 'bg-[#7a7fad] text-white border-transparent'
  };

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] font-[510] rounded-full',
    sm: 'px-2 py-0.5 text-[11px] font-[510] rounded-full',
    default: 'px-2.5 py-0.5 text-[12px] font-[510] rounded-full',
    md: 'px-3 py-1 text-[13px] font-[510] rounded-full',
    lg: 'px-4 py-1.5 text-[14px] font-[510] rounded-full',
    
    // Non-pill variants
    'square-xs': 'px-1.5 py-0.5 text-[10px] font-[510] rounded-[2px]',
    'square-sm': 'px-2 py-0.5 text-[11px] font-[510] rounded-[2px]',
    'square-default': 'px-2.5 py-0.5 text-[12px] font-[510] rounded-[2px]',
    'square-md': 'px-3 py-1 text-[13px] font-[510] rounded-[2px]',
    'square-lg': 'px-4 py-1.5 text-[14px] font-[510] rounded-[2px]'
  };

  const isPill = !size.startsWith('square-');
  const baseClasses = `
    inline-flex items-center gap-1.5 
    transition-all duration-200
    focus:outline-none
    focus:ring-2
    focus:ring-[var(--ln-accent-violet)]
    focus:ring-offset-2
    focus:ring-offset-transparent
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `;

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove?.();
  };

  return (
    <span className={baseClasses} {...props}>
      {children}
      {removable && (
        <button
          type="button"
          onClick={handleRemove}
          className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-current/20 hover:bg-current/30 transition-colors duration-200"
          aria-label="Remove badge"
        >
          <X className="w-2 h-2" weight="bold" />
        </button>
      )}
    </span>
  );
};

// Status Dot Component - Para indicadores de estado
export const StatusDot = ({ 
  status = 'active', 
  size = 'default', 
  className = '', 
  ...props 
}) => {
  const statusClasses = {
    active: 'bg-[#10b981]',
    inactive: 'bg-[#62666d]',
    warning: 'bg-[#f59e0b]',
    error: 'bg-[#ef4444]',
    info: 'bg-[#0ea5e9]',
    success: 'bg-[#10b981]',
    pending: 'bg-[#f59e0b]',
    processing: 'bg-[#0ea5e9]'
  };

  const sizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    default: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5'
  };

  return (
    <span 
      className={`inline-block rounded-full ${statusClasses[status]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
};

// Status Badge Component - Badge con dot y texto
export const StatusBadge = ({ 
  status = 'active', 
  children, 
  size = 'default', 
  showDot = true, 
  className = '', 
  ...props 
}) => {
  const statusVariantMap = {
    active: 'success',
    inactive: 'subtle',
    warning: 'warning',
    error: 'error',
    info: 'info',
    success: 'success',
    pending: 'warning',
    processing: 'info'
  };

  return (
    <Badge 
      variant={statusVariantMap[status] || 'neutral'}
      size={size}
      className={`gap-2 ${className}`}
      {...props}
    >
      {showDot && <StatusDot status={status} size="xs" />}
      {children}
    </Badge>
  );
};

// Counter Badge - Para notificaciones y contadores
export const CounterBadge = ({ 
  count, 
  max = 99, 
  showZero = false, 
  size = 'default', 
  className = '', 
  ...props 
}) => {
  if (count === 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count;
  
  const sizeClasses = {
    xs: 'min-w-[12px] h-3 text-[8px] px-1',
    sm: 'min-w-[16px] h-4 text-[10px] px-1',
    default: 'min-w-[20px] h-5 text-[11px] px-1.5',
    md: 'min-w-[24px] h-6 text-[12px] px-2',
    lg: 'min-w-[28px] h-7 text-[13px] px-2'
  };

  return (
    <Badge 
      variant="error"
      size={size}
      className={`flex items-center justify-center font-[590] ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {displayCount}
    </Badge>
  );
};

// Tag Component - Para etiquetas removibles
export const Tag = ({ 
  children, 
  color = 'neutral', 
  onRemove, 
  removable = true, 
  size = 'default', 
  className = '', 
  ...props 
}) => {
  const colorClasses = {
    neutral: 'bg-[rgba(255,255,255,0.05)] text-[#d0d6e0] border border-[rgba(255,255,255,0.08)]',
    blue: 'bg-[rgba(94,106,210,0.1)] text-[#5e6ad2] border border-[rgba(94,106,210,0.2)]',
    green: 'bg-[rgba(39,166,68,0.1)] text-[#27a644] border border-[rgba(39,166,68,0.2)]',
    yellow: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]',
    red: 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]',
    purple: 'bg-[rgba(113,112,255,0.1)] text-[#7170ff] border border-[rgba(113,112,255,0.2)]'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-[11px] font-[510] rounded-md',
    default: 'px-3 py-1.5 text-[12px] font-[510] rounded-md',
    lg: 'px-4 py-2 text-[13px] font-[510] rounded-md'
  };

  return (
    <Badge 
      variant="custom"
      size={size}
      removable={removable}
      onRemove={onRemove}
      className={`${colorClasses[color]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </Badge>
  );
};

export default Badge;
