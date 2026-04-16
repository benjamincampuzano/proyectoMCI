import React, { useState, useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';
import Typography from './Typography';

/**
 * Drawer/Panel Component - Estilo Linear completo
 * Paneles laterales con múltiples posiciones y animaciones suaves
 */

const Drawer = ({ 
  isOpen, 
  onClose, 
  position = 'right', 
  size = 'default', 
  overlay = true, 
  closeOnOverlayClick = true, 
  closeOnEscape = true, 
  children, 
  className = '', 
  ...props 
}) => {
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    if (isOpen && closeOnEscape) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeOnEscape, onClose]);

  const getPositionClasses = () => {
    const positions = {
      left: 'fixed left-0 top-0 h-full',
      right: 'fixed right-0 top-0 h-full',
      top: 'fixed top-0 left-0 right-0 w-full',
      bottom: 'fixed bottom-0 left-0 right-0 w-full'
    };

    return positions[position] || positions.right;
  };

  const getSizeClasses = () => {
    const sizes = {
      left: {
        sm: 'w-64',
        default: 'w-80',
        lg: 'w-96',
        xl: 'w-128'
      },
      right: {
        sm: 'w-64',
        default: 'w-80',
        lg: 'w-96',
        xl: 'w-128'
      },
      top: {
        sm: 'h-32',
        default: 'h-48',
        lg: 'h-64',
        xl: 'h-80'
      },
      bottom: {
        sm: 'h-32',
        default: 'h-48',
        lg: 'h-64',
        xl: 'h-80'
      }
    };

    return sizes[position]?.[size] || sizes.right.default;
  };

  const getTransformClasses = () => {
    const transforms = {
      left: isOpen ? 'translate-x-0' : '-translate-x-full',
      right: isOpen ? 'translate-x-0' : 'translate-x-full',
      top: isOpen ? 'translate-y-0' : '-translate-y-full',
      bottom: isOpen ? 'translate-y-0' : 'translate-y-full'
    };

    return transforms[position] || transforms.right;
  };

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };

  if (!isOpen && !overlay) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      {overlay && isOpen && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-[2px] z-[60]"
          onClick={handleOverlayClick}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`
          ${getPositionClasses()}
          ${getSizeClasses()}
          ${getTransformClasses()}
          bg-[var(--ln-bg-surface)]
          border-l border-[rgba(255,255,255,0.08)]
          shadow-[rgba(0,0,0,0.4)_0px_2px_4px,rgba(0,0,0,0.2)_0px_0px_0px_1px]
          transform transition-transform duration-300 ease-out
          z-[70]
          ${className}
        `}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.05)]">
          <Typography variant="body-medium" className="text-[var(--ln-text-primary)] font-[590]">
            {props.title || 'Panel'}
          </Typography>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)] transition-all duration-200"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4 text-[var(--ln-text-tertiary)]" weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
};

// Panel Component - Drawer sin overlay
export const Panel = ({ 
  isOpen, 
  position = 'right', 
  size = 'default', 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => {}}
      position={position}
      size={size}
      overlay={false}
      className={className}
      {...props}
    >
      {children}
    </Drawer>
  );
};

// Slide Panel - Para contenido deslizante
export const SlidePanel = ({ 
  isOpen, 
  onToggle, 
  position = 'right', 
  size = 'default', 
  title, 
  children, 
  className = '', 
  ...props 
}) => {
  const panelRef = useRef(null);

  const getPositionClasses = () => {
    const positions = {
      left: 'fixed left-0 top-0 h-full',
      right: 'fixed right-0 top-0 h-full',
      top: 'fixed top-0 left-0 right-0 w-full',
      bottom: 'fixed bottom-0 left-0 right-0 w-full'
    };

    return positions[position] || positions.right;
  };

  const getSizeClasses = () => {
    const sizes = {
      left: {
        sm: 'w-64',
        default: 'w-80',
        lg: 'w-96'
      },
      right: {
        sm: 'w-64',
        default: 'w-80',
        lg: 'w-96'
      },
      top: {
        sm: 'h-32',
        default: 'h-48',
        lg: 'h-64'
      },
      bottom: {
        sm: 'h-32',
        default: 'h-48',
        lg: 'h-64'
      }
    };

    return sizes[position]?.[size] || sizes.right.default;
  };

  const getTransformClasses = () => {
    const transforms = {
      left: isOpen ? 'translate-x-0' : '-translate-x-full',
      right: isOpen ? 'translate-x-0' : 'translate-x-full',
      top: isOpen ? 'translate-y-0' : '-translate-y-full',
      bottom: isOpen ? 'translate-y-0' : 'translate-y-full'
    };

    return transforms[position] || transforms.right;
  };

  return (
    <div
      ref={panelRef}
      className={`
        ${getPositionClasses()}
        ${getSizeClasses()}
        ${getTransformClasses()}
        bg-[var(--ln-bg-surface)]
        border-l border-[rgba(255,255,255,0.08)]
        shadow-[rgba(0,0,0,0.4)_0px_2px_4px,rgba(0,0,0,0.2)_0px_0px_0px_1px]
        transform transition-transform duration-300 ease-out
        z-[50]
        ${className}
      `}
      {...props}
    >
      {/* Toggle Button */}
      <button
        type="button"
        onClick={onToggle}
        className="absolute top-4 right-4 p-2 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)] transition-all duration-200"
        aria-label="Toggle panel"
      >
        <X className="w-4 h-4 text-[var(--ln-text-tertiary)]" weight="bold" />
      </button>

      {/* Header */}
      {title && (
        <div className="p-4 border-b border-[rgba(255,255,255,0.05)]">
          <Typography variant="body-medium" className="text-[var(--ln-text-primary)] font-[590]">
            {title}
          </Typography>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
};

// Collapsible Panel - Para contenido colapsable
export const CollapsiblePanel = ({ 
  title, 
  children, 
  defaultOpen = false, 
  className = '', 
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-lg ${className}`} {...props}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[rgba(255,255,255,0.04)] transition-all duration-200"
      >
        <Typography variant="body-medium" className="text-[var(--ln-text-primary)] font-[590]">
          {title}
        </Typography>
        <X 
          className={`w-4 h-4 text-[var(--ln-text-tertiary)] transition-transform duration-200 ${
            isOpen ? 'rotate-45' : ''
          }`} 
          weight="bold" 
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="px-4 pb-4 border-t border-[rgba(255,255,255,0.05)]">
          {children}
        </div>
      )}
    </div>
  );
};

// Hook para manejar drawers
export const useDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(!isOpen);

  return {
    isOpen,
    open,
    close,
    toggle
  };
};

export default Drawer;
