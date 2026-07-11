import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { X, Spinner } from '@phosphor-icons/react';
import PropTypes from 'prop-types';

// Hook personalizado para combinar refs
const useCombinedRefs = (...refs) => {
  const targetRef = useRef();

  useEffect(() => {
    refs.forEach(ref => {
      if (!ref) return;

      if (typeof ref === 'function') {
        ref(targetRef.current);
      } else {
        ref.current = targetRef.current;
      }
    });
  }, [refs]);

  return targetRef;
};

const Modal = forwardRef(({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = '',
  noContentScroll = false,
  returnFocus = true,
  preventBodyScroll = true,
  loading = false,
  variant = 'default',
  ...props
}, ref) => {
  const [isExiting, setIsExiting] = useState(false);
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const combinedRef = useCombinedRefs(ref, modalRef);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  const variantClasses = {
    default: 'border-[var(--ln-border-standard)]',
    danger: 'border-red-500/50 shadow-red-500/10',
    success: 'border-green-500/50 shadow-green-500/10'
  };

  // Focus trap implementation
  const trapFocus = (e) => {
    if (e.key !== 'Tab') return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) || [];

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  // Handler unificado para cerrar el modal con animación
  const closeModal = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsExiting(false);
    }, 200);
  }, [onClose]);

  // Guardar el elemento activo antes de abrir el modal
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
    }
  }, [isOpen]);

  // Return focus al cerrar
  useEffect(() => {
    if (!isOpen && returnFocus && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen, returnFocus]);

  // Focus en el modal al abrir
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const closeBtn = modalRef.current.querySelector('button[aria-label="Cerrar modal"]');
      closeBtn?.focus() || modalRef.current.focus();
    }
  }, [isOpen]);

  // Event listener para Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeModal]);

  // Prevenir scroll del body
  useEffect(() => {
    if (preventBodyScroll && isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${window.innerWidth - document.body.clientWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen, preventBodyScroll]);

  // Exponer métodos imperativos
  useImperativeHandle(ref, () => ({
    close: closeModal,
    focus: () => modalRef.current?.focus()
  }));

  if (!isOpen && !isExiting) return null;

  return (
    <div
      className={`fixed inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-[2px] z-[100] flex items-center justify-center sm:p-4 ${
        isExiting ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-200'
      }`}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          closeModal();
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && closeOnBackdropClick && e.target === e.currentTarget) {
          closeModal();
        }
      }}
      role="button"
      tabIndex={-1}
      {...props}
    >
      <div
        ref={combinedRef}
        className={`bg-[var(--ln-bg-surface)] ${variantClasses[variant]} sm:rounded-xl w-full h-full sm:h-auto sm:max-h-[90vh] ${sizeClasses[size]} overflow-hidden flex flex-col ${className} ${
          isExiting ? 'animate-out zoom-out-95 duration-200' : 'animate-in zoom-in-95 duration-200'
        } shadow-[rgba(0,0,0,0)_0px_8px_2px,rgba(0,0,0,0.01)_0px_5px_2px,rgba(0,0,0,0.04)_0px_3px_2px,rgba(0,0,0,0.07)_0px_1px_1px,rgba(0,0,0,0.08)_0px_0px_1px] relative`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          trapFocus(e);
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby="modal-content"
        tabIndex={-1}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-[var(--ln-bg-surface)]/80 flex items-center justify-center z-10 backdrop-blur-sm">
            <Spinner className="w-8 h-8 animate-spin text-[var(--ln-brand-indigo)]" weight="bold" />
          </div>
        )}

        {(title || showCloseButton) && (
          <ModalHeader>
            <div className="flex justify-between items-center">
              {title && (
                <h3 id="modal-title" className="text-lg sm:text-[20px] font-[590] text-[var(--ln-text-primary)] tracking-[-0.24px] leading-[1.33]">
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  onClick={closeModal}
                  className="text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] transition-colors p-2 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)]"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </ModalHeader>
        )}

        <ModalContent noContentScroll={noContentScroll} id="modal-content">
          {children}
        </ModalContent>
      </div>
    </div>
  );
});

const ModalContent = ({ children, className = '', noContentScroll = false, ...props }) => (
  <div className={`flex-1 flex flex-col min-h-0 px-4 sm:px-6 py-4 sm:py-6 text-[15px] font-[400] text-[var(--ln-text-secondary)] leading-[1.60] tracking-[-0.165px] ${noContentScroll ? 'overflow-hidden' : 'overflow-y-auto'} ${className}`} {...props}>
    {children}
  </div>
);

const ModalFooter = ({ children, className = '', ...props }) => (
  <div className={`px-4 sm:px-6 py-4 sm:py-5 bg-[rgba(255,255,255,0.02)] border-t border-[rgba(255,255,255,0.08)] flex-shrink-0 ${className}`} {...props}>
    {children}
  </div>
);

const ModalHeader = ({ children, className = '', ...props }) => (
  <div className={`px-4 sm:px-6 py-4 sm:py-5 border-b border-[rgba(255,255,255,0.08)] flex-shrink-0 ${className}`} {...props}>
    {children}
  </div>
);

// Attach sub-components to Modal
Modal.Content = ModalContent;
Modal.Footer = ModalFooter;
Modal.Header = ModalHeader;

// Set display name for debugging
Modal.displayName = 'Modal';
ModalContent.displayName = 'ModalContent';
ModalFooter.displayName = 'ModalFooter';
ModalHeader.displayName = 'ModalHeader';

// PropTypes
Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
  showCloseButton: PropTypes.bool,
  closeOnBackdropClick: PropTypes.bool,
  className: PropTypes.string,
  noContentScroll: PropTypes.bool,
  returnFocus: PropTypes.bool,
  preventBodyScroll: PropTypes.bool,
  loading: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'danger', 'success'])
};

ModalContent.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  noContentScroll: PropTypes.bool
};

ModalFooter.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

ModalHeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export default Modal;
