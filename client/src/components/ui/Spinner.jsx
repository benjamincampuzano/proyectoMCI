import React from 'react';

/**
 * Spinner Component - Animaciones Linear completas
 * Loading indicators con estilos consistentes y animaciones suaves
 */

const Spinner = ({ 
  size = 'default', 
  variant = 'default', 
  color = 'primary', 
  className = '', 
  ...props 
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    default: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
    '2xl': 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-[var(--ln-accent-violet)]',
    secondary: 'text-[var(--ln-text-secondary)]',
    white: 'text-white',
    success: 'text-[#10b981]',
    warning: 'text-[#f59e0b]',
    error: 'text-[#ef4444]',
    info: 'text-[#0ea5e9]'
  };

  const variantClasses = {
    // Default spinning circle
    default: 'animate-spin border-2 border-current border-t-transparent rounded-full',
    
    // Dotted spinner
    dots: 'flex gap-1',
    
    // Pulse spinner
    pulse: 'animate-pulse rounded-full bg-current',
    
    // Bouncing dots
    bounce: 'flex gap-1',
    
    // Wave dots
    wave: 'flex gap-1',
    
    // Minimal spinner
    minimal: 'animate-spin border border-current border-t-transparent rounded-full'
  };

  const baseClasses = `${sizeClasses[size]} ${colorClasses[color]} ${variantClasses[variant]} ${className}`;

  if (variant === 'dots') {
    return (
      <div className={baseClasses} {...props}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
            style={{
              animationDelay: `${i * 0.16}s`,
              animationDuration: '1.4s'
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'bounce') {
    return (
      <div className={baseClasses} {...props}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
            style={{
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'wave') {
    return (
      <div className={baseClasses} {...props}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-1 h-4 rounded-full bg-current"
            style={{
              animation: 'wave 1.4s infinite ease-in-out',
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
    );
  }

  return <div className={baseClasses} {...props} />;
};

// Loading Skeleton Component
export const Skeleton = ({ 
  lines = 1, 
  width = 'full', 
  height = 'default', 
  className = '', 
  ...props 
}) => {
  const heightClasses = {
    sm: 'h-3',
    default: 'h-4',
    md: 'h-5',
    lg: 'h-6',
    xl: 'h-8'
  };

  const widthClasses = {
    xs: 'w-8',
    sm: 'w-12',
    md: 'w-16',
    lg: 'w-24',
    xl: 'w-32',
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4'
  };

  return (
    <div className={`space-y-2 ${className}`} {...props}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`
            ${heightClasses[height]} 
            ${width === 'full' || width === 'random' ? widthClasses[width] : i === lines - 1 ? widthClasses['3/4'] : widthClasses.full}
            bg-[rgba(255,255,255,0.05)] 
            rounded 
            animate-pulse
          `}
          style={{
            width: width === 'random' ? `${Math.random() * 40 + 60}%` : undefined
          }}
        />
      ))}
    </div>
  );
};

// Card Skeleton Component
export const CardSkeleton = ({ 
  showAvatar = false, 
  showTitle = true, 
  showSubtitle = true, 
  lines = 3, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 ${className}`} {...props}>
      {showAvatar && (
        <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] animate-pulse mb-4" />
      )}
      
      {showTitle && (
        <div className="h-5 w-3/4 bg-[rgba(255,255,255,0.05)] rounded animate-pulse mb-2" />
      )}
      
      {showSubtitle && (
        <div className="h-4 w-1/2 bg-[rgba(255,255,255,0.05)] rounded animate-pulse mb-4" />
      )}
      
      <Skeleton lines={lines} height="default" />
    </div>
  );
};

// Table Skeleton Component
export const TableSkeleton = ({ 
  rows = 5, 
  columns = 4, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden ${className}`} {...props}>
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }, (_, i) => (
            <div key={i} className="h-4 bg-[rgba(255,255,255,0.05)] rounded animate-pulse" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="border-b border-[rgba(255,255,255,0.05)] px-4 py-3 last:border-b-0">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <div key={colIndex} className="h-4 bg-[rgba(255,255,255,0.05)] rounded animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Progress Bar Component
export const Progress = ({ 
  value = 0, 
  max = 100, 
  size = 'default', 
  variant = 'default', 
  showLabel = false, 
  className = '', 
  ...props 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    default: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const variantClasses = {
    default: 'bg-[rgba(255,255,255,0.05)]',
    success: 'bg-[rgba(16,185,129,0.1)]',
    warning: 'bg-[rgba(245,158,11,0.1)]',
    error: 'bg-[rgba(239,68,68,0.1)]'
  };

  const progressColorClasses = {
    default: 'bg-[var(--ln-accent-violet)]',
    success: 'bg-[#10b981]',
    warning: 'bg-[#f59e0b]',
    error: 'bg-[#ef4444]'
  };

  return (
    <div className={`w-full ${className}`} {...props}>
      {showLabel && (
        <div className="flex justify-between mb-2">
          <span className="text-[11px] font-[510] text-[var(--ln-text-tertiary)] uppercase tracking-wider">
            Progress
          </span>
          <span className="text-[11px] font-[510] text-[var(--ln-text-tertiary)]">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      
      <div className={`w-full ${sizeClasses[size]} ${variantClasses[variant]} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${progressColorClasses[variant]} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default Spinner;
