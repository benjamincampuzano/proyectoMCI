import React, { useState } from 'react';
import Typography from './Typography';

/**
 * Tabs Component - Estilo Linear completo
 * Navigation por tabs con borders y hover states consistentes
 */

const Tabs = ({ 
  items = [], 
  defaultActiveIndex = 0, 
  onTabChange, 
  variant = 'default', 
  size = 'default', 
  className = '', 
  ...props 
}) => {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);

  const handleTabClick = (index) => {
    setActiveIndex(index);
    onTabChange?.(index, items[index]);
  };

  const variantClasses = {
    // Default tabs - border bottom
    default: {
      container: 'border-b border-[rgba(255,255,255,0.08)]',
      tab: 'border-b-2 border-transparent',
      active: 'border-[var(--ln-accent-violet)] text-[var(--ln-accent-violet)]',
      inactive: 'border-transparent text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:border-[rgba(255,255,255,0.05)]'
    },
    
    // Pills tabs - rounded pills
    pills: {
      container: 'bg-[rgba(255,255,255,0.02)] p-1 rounded-lg',
      tab: 'rounded-md',
      active: 'bg-[var(--ln-accent-violet)] text-white',
      inactive: 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
    },
    
    // Underline tabs - animated underline
    underline: {
      container: 'relative',
      tab: 'relative',
      active: 'text-[var(--ln-text-primary)]',
      inactive: 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'
    },
    
    // Segmented tabs - segmented control
    segmented: {
      container: 'bg-[rgba(255,255,255,0.02)] p-0.5 rounded-lg border border-[rgba(255,255,255,0.08)]',
      tab: 'rounded-md',
      active: 'bg-[var(--ln-bg-surface)] text-[var(--ln-text-primary)] shadow-[rgba(0,0,0,0.2)_0px_0px_0px_1px]',
      inactive: 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'
    }
  };

  const sizeClasses = {
    sm: {
      tab: 'py-2 px-3 text-[12px] font-[510]'
    },
    default: {
      tab: 'py-3 px-4 text-[13px] font-[510]'
    },
    lg: {
      tab: 'py-4 px-6 text-[14px] font-[510]'
    }
  };

  const currentVariant = variantClasses[variant];
  const currentSize = sizeClasses[size];

  return (
    <div className={`w-full ${className}`} {...props}>
      {/* Tab Headers */}
      <div className={`flex ${currentVariant.container}`}>
        {items.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleTabClick(index)}
            disabled={item.disabled}
            className={`
              flex items-center gap-2 transition-all duration-200 focus:outline-none
              ${currentVariant.tab}
              ${currentSize.tab}
              ${activeIndex === index ? currentVariant.active : currentVariant.inactive}
              ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {item.icon && (
              <span className="flex-shrink-0">
                {item.icon}
              </span>
            )}
            {item.title && (
              <span className="truncate">
                {item.title}
              </span>
            )}
            {item.badge && (
              <span className="flex-shrink-0">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Underline indicator for underline variant */}
      {variant === 'underline' && (
        <div className="relative h-0.5">
          <div 
            className="absolute bottom-0 h-0.5 bg-[var(--ln-accent-violet)] transition-all duration-300 ease-out"
            style={{
              left: `${(activeIndex / items.length) * 100}%`,
              width: `${(1 / items.length) * 100}%`
            }}
          />
        </div>
      )}

      {/* Tab Content */}
      <div className="mt-6">
        {items[activeIndex]?.content}
      </div>
    </div>
  );
};

// Tab Panel Component - Para contenido de tabs individuales
export const TabPanel = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`text-[15px] font-[400] text-[var(--ln-text-secondary)] leading-[1.60] tracking-[-0.165px] ${className}`} {...props}>
      {children}
    </div>
  );
};

// Tab List Component - Para listado de tabs programático
const TabList = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`flex border-b border-[rgba(255,255,255,0.08)] ${className}`} {...props}>
      {children}
    </div>
  );
};

// Tab Component - Tab individual
const Tab = ({ 
  children, 
  active = false, 
  onClick, 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        py-3 px-4 text-[13px] font-[510] border-b-2 transition-all duration-200 focus:outline-none
        ${active 
          ? 'border-[var(--ln-accent-violet)] text-[var(--ln-accent-violet)]' 
          : 'border-transparent text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:border-[rgba(255,255,255,0.05)]'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

// Vertical Tabs Component
const VerticalTabs = ({ 
  items = [], 
  defaultActiveIndex = 0, 
  onTabChange, 
  size = 'default', 
  className = '', 
  ...props 
}) => {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);

  const handleTabClick = (index) => {
    setActiveIndex(index);
    onTabChange?.(index, items[index]);
  };

  const sizeClasses = {
    sm: 'py-2 px-3 text-[12px] font-[510]',
    default: 'py-3 px-4 text-[13px] font-[510]',
    lg: 'py-4 px-6 text-[14px] font-[510]'
  };

  return (
    <div className={`flex gap-6 ${className}`} {...props}>
      {/* Tab Headers */}
      <div className="flex flex-col space-y-1">
        {items.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleTabClick(index)}
            disabled={item.disabled}
            className={`
              text-left transition-all duration-200 focus:outline-none rounded-lg
              ${sizeClasses[size]}
              ${activeIndex === index 
                ? 'bg-[var(--ln-accent-violet)] text-white' 
                : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
              }
              ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center gap-2">
              {item.icon && (
                <span className="flex-shrink-0">
                  {item.icon}
                </span>
              )}
              {item.title && (
                <span className="truncate">
                  {item.title}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        <TabPanel>
          {items[activeIndex]?.content}
        </TabPanel>
      </div>
    </div>
  );
};

export default Tabs;
export { TabList, Tab, VerticalTabs };

