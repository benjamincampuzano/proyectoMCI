import React, { useState, useRef, useEffect } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import Typography from './Typography';

/**
 * Dropdown Menu Component - Estilo Linear completo
 * Con elevación Level 5 shadows y posicionamiento inteligente
 */

const Dropdown = ({ 
  trigger, 
  items = [], 
  position = 'bottom-left', 
  width = 'auto', 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [calculatedPosition, setCalculatedPosition] = useState(position);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      calculatePosition();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const calculatePosition = () => {
    if (!dropdownRef.current || !triggerRef.current) return position;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Check for overflow and adjust position
    let newPosition = position;

    switch (position) {
      case 'bottom-left':
        if (triggerRect.bottom + dropdownRect.height > viewport.height) {
          newPosition = 'top-left';
        }
        if (triggerRect.left + dropdownRect.width > viewport.width) {
          newPosition = 'bottom-right';
        }
        break;
      case 'bottom-right':
        if (triggerRect.bottom + dropdownRect.height > viewport.height) {
          newPosition = 'top-right';
        }
        if (triggerRect.right - dropdownRect.width < 0) {
          newPosition = 'bottom-left';
        }
        break;
      case 'top-left':
        if (triggerRect.top - dropdownRect.height < 0) {
          newPosition = 'bottom-left';
        }
        if (triggerRect.left + dropdownRect.width > viewport.width) {
          newPosition = 'top-right';
        }
        break;
      case 'top-right':
        if (triggerRect.top - dropdownRect.height < 0) {
          newPosition = 'bottom-right';
        }
        if (triggerRect.right - dropdownRect.width < 0) {
          newPosition = 'top-left';
        }
        break;
    }

    setCalculatedPosition(newPosition);
  };

  const getPositionClasses = () => {
    const positions = {
      'bottom-left': 'top-full left-0 mt-1',
      'bottom-right': 'top-full right-0 mt-1',
      'bottom-center': 'top-full left-1/2 transform -translate-x-1/2 mt-1',
      'top-left': 'bottom-full left-0 mb-1',
      'top-right': 'bottom-full right-0 mb-1',
      'top-center': 'bottom-full left-1/2 transform -translate-x-1/2 mb-1'
    };

    return positions[calculatedPosition] || positions['bottom-left'];
  };

  const handleItemClick = (item) => {
    if (item.disabled) return;
    
    item.onClick?.();
    if (item.closeOnClick !== false) {
      setIsOpen(false);
    }
  };

  const widthClasses = {
    auto: 'w-auto',
    full: 'w-full',
    sm: 'w-32',
    md: 'w-48',
    lg: 'w-64',
    xl: 'w-80'
  };

  return (
    <div className={`relative inline-block ${className}`} {...props}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`inline-block ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {trigger}
      </div>

      {/* Dropdown Content */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 ${getPositionClasses()} ${widthClasses[width]} min-w-[200px]`}
        >
          {/* Dropdown Container */}
          <div className="bg-[var(--ln-bg-surface)] border border-[rgba(255,255,255,0.08)] rounded-lg shadow-[rgba(0,0,0,0)_0px_8px_2px,rgba(0,0,0,0.01)_0px_5px_2px,rgba(0,0,0,0.04)_0px_3px_2px,rgba(0,0,0,0.07)_0px_1px_1px,rgba(0,0,0,0.08)_0px_0px_1px] overflow-hidden">
            {/* Items */}
            <div className="py-1">
              {items.map((item, index) => {
                if (item.divider) {
                  return (
                    <div key={index} className="border-t border-[rgba(255,255,255,0.05)] my-1" />
                  );
                }

                if (item.header) {
                  return (
                    <div key={index} className="px-3 py-2">
                      <Typography variant="caption" className="text-[var(--ln-text-tertiary)] uppercase tracking-wider font-[510]">
                        {item.label}
                      </Typography>
                    </div>
                  );
                }

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    className={`
                      w-full px-3 py-2 text-left flex items-center gap-3 transition-all duration-200
                      ${item.disabled 
                        ? 'opacity-40 cursor-not-allowed text-[var(--ln-text-quaternary)]' 
                        : 'text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
                      }
                      ${item.active ? 'bg-[rgba(113,112,255,0.1)] text-[var(--ln-accent-violet)]' : ''}
                      ${item.dangerous ? 'text-[#ef4444] hover:text-[#ff453a]' : ''}
                    `}
                  >
                    {item.icon && (
                      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                        {item.icon}
                      </span>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <Typography variant="body" className="truncate">
                        {item.label}
                      </Typography>
                      {item.description && (
                        <Typography variant="caption" className="text-[var(--ln-text-tertiary)] mt-0.5">
                          {item.description}
                        </Typography>
                      )}
                    </div>

                    {item.active && (
                      <Check className="w-4 h-4 text-[var(--ln-accent-violet)] flex-shrink-0" weight="bold" />
                    )}

                    {item.shortcut && (
                      <Typography variant="caption" className="text-[var(--ln-text-tertiary)] font-[400]">
                        {item.shortcut}
                      </Typography>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Select Dropdown Component
export const SelectDropdown = ({ 
  value, 
  options = [], 
  placeholder = 'Seleccionar...', 
  onChange, 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  const selectedOption = options.find(option => option.value === value);

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      className={`
        w-full px-3.5 py-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-md
        flex items-center justify-between gap-3 transition-all duration-200
        focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px]
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-[rgba(255,255,255,0.12)]'}
      `}
    >
      <span className={`text-[16px] font-[400] ${value ? 'text-[var(--ln-text-primary)]' : 'text-[var(--ln-text-tertiary)]'}`}>
        {selectedOption?.label || placeholder}
      </span>
      <CaretDown className="w-4 h-4 text-[var(--ln-text-tertiary)] transition-transform duration-200" />
    </button>
  );

  const items = options.map((option) => ({
    label: option.label,
    value: option.value,
    active: option.value === value,
    onClick: () => onChange?.(option.value),
    icon: option.icon
  }));

  return (
    <Dropdown
      trigger={trigger}
      items={items}
      width="full"
      disabled={disabled}
      className={className}
      {...props}
    />
  );
};

// Context Menu Component
export const ContextMenu = ({ 
  children, 
  items = [], 
  className = '', 
  ...props 
}) => {
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (event) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleClick = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => {
        document.removeEventListener('click', handleClick);
      };
    }
  }, [contextMenu]);

  return (
    <div 
      className={`inline-block ${className}`}
      onContextMenu={handleContextMenu}
      {...props}
    >
      {children}
      
      {contextMenu && (
        <div
          className="fixed z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          <div className="bg-[var(--ln-bg-surface)] border border-[rgba(255,255,255,0.08)] rounded-lg shadow-[rgba(0,0,0,0)_0px_8px_2px,rgba(0,0,0,0.01)_0px_5px_2px,rgba(0,0,0,0.04)_0px_3px_2px,rgba(0,0,0,0.07)_0px_1px_1px,rgba(0,0,0,0.08)_0px_0px_1px] overflow-hidden min-w-[180px]">
            <div className="py-1">
              {items.map((item, index) => {
                if (item.divider) {
                  return (
                    <div key={index} className="border-t border-[rgba(255,255,255,0.05)] my-1" />
                  );
                }

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      item.onClick?.();
                      setContextMenu(null);
                    }}
                    disabled={item.disabled}
                    className={`
                      w-full px-3 py-2 text-left flex items-center gap-3 transition-all duration-200
                      ${item.disabled 
                        ? 'opacity-40 cursor-not-allowed text-[var(--ln-text-quaternary)]' 
                        : 'text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
                      }
                    `}
                  >
                    {item.icon && (
                      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                        {item.icon}
                      </span>
                    )}
                    <Typography variant="body" className="truncate">
                      {item.label}
                    </Typography>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
