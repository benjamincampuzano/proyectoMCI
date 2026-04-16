import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { X, Check, Warning, Info, XCircle } from '@phosphor-icons/react';
import Typography from './Typography';

/**
 * Toast System - Estilo Linear completo
 * Notificaciones flotantes con múltiples variantes y posicionamiento
 */

// Context para Toast System
const ToastContext = createContext();

// Hook para usar Toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Provider
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove después del timeout
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Métodos de conveniencia
  const toast = {
    success: (message, options = {}) => addToast({ type: 'success', message, ...options }),
    error: (message, options = {}) => addToast({ type: 'error', message, ...options }),
    warning: (message, options = {}) => addToast({ type: 'warning', message, ...options }),
    info: (message, options = {}) => addToast({ type: 'info', message, ...options }),
    loading: (message, options = {}) => addToast({ type: 'loading', message, duration: 0, ...options }),
    remove: removeToast,
    clear: clearAllToasts
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

// Toast Container Component
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Toast Item Component
const ToastItem = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animación de entrada
    setIsVisible(true);
  }, []);

  const handleRemove = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove();
    }, 300);
  }, [onRemove]);

  const getToastIcon = () => {
    const icons = {
      success: <Check className="w-5 h-5 text-[#10b981]" weight="bold" />,
      error: <XCircle className="w-5 h-5 text-[#ef4444]" weight="bold" />,
      warning: <Warning className="w-5 h-5 text-[#f59e0b]" weight="bold" />,
      info: <Info className="w-5 h-5 text-[#0ea5e9]" weight="bold" />,
      loading: <div className="w-5 h-5 border-2 border-[var(--ln-accent-violet)] border-t-transparent rounded-full animate-spin" />
    };

    return icons[toast.type] || icons.info;
  };

  const getToastClasses = () => {
    const baseClasses = `
      pointer-events-auto
      max-w-md w-full
      bg-[var(--ln-bg-surface)]
      border border-[rgba(255,255,255,0.08)]
      rounded-lg
      shadow-[rgba(0,0,0,0)_0px_8px_2px,rgba(0,0,0,0.01)_0px_5px_2px,rgba(0,0,0,0.04)_0px_3px_2px,rgba(0,0,0,0.07)_0px_1px_1px,rgba(0,0,0,0.08)_0px_0px_1px]
      transform transition-all duration-300 ease-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      ${isLeaving ? 'translate-x-full opacity-0 scale-95' : ''}
    `;

    const typeClasses = {
      success: 'border-l-4 border-l-[#10b981]',
      error: 'border-l-4 border-l-[#ef4444]',
      warning: 'border-l-4 border-l-[#f59e0b]',
      info: 'border-l-4 border-l-[#0ea5e9]',
      loading: 'border-l-4 border-l-[var(--ln-accent-violet)]'
    };

    return `${baseClasses} ${typeClasses[toast.type] || typeClasses.info}`;
  };

  return (
    <div className={getToastClasses()}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getToastIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {toast.title && (
              <Typography variant="body-medium" className="text-[var(--ln-text-primary)] mb-1">
                {toast.title}
              </Typography>
            )}
            <Typography variant="body" className="text-[var(--ln-text-secondary)]">
              {toast.message}
            </Typography>
            
            {/* Actions */}
            {toast.actions && (
              <div className="mt-3 flex gap-2">
                {toast.actions.map((action, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={action.onClick}
                    className="px-3 py-1 text-[11px] font-[510] bg-[rgba(255,255,255,0.05)] text-[var(--ln-text-secondary)] rounded hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--ln-text-primary)] transition-all duration-200"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Close Button */}
          {toast.type !== 'loading' && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex-shrink-0 p-1 rounded-md text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-200"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" weight="bold" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Alert Component - Para mensajes estáticos
const Alert = ({ 
  type = 'info', 
  title, 
  message, 
  dismissible = false, 
  onDismiss, 
  className = '', 
  ...props 
}) => {
  const getAlertIcon = () => {
    const icons = {
      success: <Check className="w-5 h-5 text-[#10b981]" weight="bold" />,
      error: <XCircle className="w-5 h-5 text-[#ef4444]" weight="bold" />,
      warning: <Warning className="w-5 h-5 text-[#f59e0b]" weight="bold" />,
      info: <Info className="w-5 h-5 text-[#0ea5e9]" weight="bold" />
    };

    return icons[type] || icons.info;
  };

  const getAlertClasses = () => {
    const baseClasses = `
      flex items-start gap-3 p-4 rounded-lg border
      ${dismissible ? 'pr-12' : ''}
    `;

    const typeClasses = {
      success: 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)] text-[#065f46]',
      error: 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)] text-[#7f1d1d]',
      warning: 'bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)] text-[#78350f]',
      info: 'bg-[rgba(14,165,233,0.1)] border-[rgba(14,165,233,0.2)] text-[#075985]'
    };

    return `${baseClasses} ${typeClasses[type] || typeClasses.info}`;
  };

  return (
    <div className={getAlertClasses()} role="alert" {...props}>
      {/* Icon */}
      <div className="flex-shrink-0">
        {getAlertIcon()}
      </div>

      {/* Content */}
      <div className="flex-1">
        {title && (
          <Typography variant="body-medium" className="mb-1 font-[590]">
            {title}
          </Typography>
        )}
        <Typography variant="body">
          {message}
        </Typography>
      </div>

      {/* Dismiss Button */}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded-md hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" weight="bold" />
        </button>
      )}
    </div>
  );
};

// Inline Alert - Para mensajes en línea
const InlineAlert = ({ 
  type = 'info', 
  message, 
  className = '', 
  ...props 
}) => {
  const getInlineClasses = () => {
    const baseClasses = `
      inline-flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-[510]
    `;

    const typeClasses = {
      success: 'bg-[rgba(16,185,129,0.1)] text-[#065f46]',
      error: 'bg-[rgba(239,68,68,0.1)] text-[#7f1d1d]',
      warning: 'bg-[rgba(245,158,11,0.1)] text-[#78350f]',
      info: 'bg-[rgba(14,165,233,0.1)] text-[#075985]'
    };

    return `${baseClasses} ${typeClasses[type] || typeClasses.info}`;
  };

  const getInlineIcon = () => {
    const icons = {
      success: <Check className="w-4 h-4" weight="bold" />,
      error: <XCircle className="w-4 h-4" weight="bold" />,
      warning: <Warning className="w-4 h-4" weight="bold" />,
      info: <Info className="w-4 h-4" weight="bold" />
    };

    return icons[type] || icons.info;
  };

  return (
    <div className={getInlineClasses()} role="alert" {...props}>
      {getInlineIcon()}
      <Typography variant="caption" className="truncate">
        {message}
      </Typography>
    </div>
  );
};

// Toast Component (alias for ToastItem)
export const Toast = ToastItem;

// Alert Components
export { Alert, InlineAlert };

export default ToastProvider;

