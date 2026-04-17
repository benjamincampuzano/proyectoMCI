import React from 'react';
import { X } from '@phosphor-icons/react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = '',
  noContentScroll = false,
  ...props
}) => {
  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-[2px] z-[100] flex items-center justify-center sm:p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleBackdropClick()}
      role="button"
      tabIndex={-1}
      {...props}
    >
      <div
        className={`bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] sm:rounded-xl w-full h-full sm:h-auto sm:max-h-[90vh] ${sizeClasses[size]} overflow-hidden flex flex-col ${className} animate-in zoom-in-95 duration-200 shadow-[rgba(0,0,0,0)_0px_8px_2px,rgba(0,0,0,0.01)_0px_5px_2px,rgba(0,0,0,0.04)_0px_3px_2px,rgba(0,0,0,0.07)_0px_1px_1px,rgba(0,0,0,0.08)_0px_0px_1px]`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {(title || showCloseButton) && (
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-center flex-shrink-0">
            {title && (
              <h3 className="text-lg sm:text-[20px] font-[590] text-[var(--ln-text-primary)] tracking-[-0.24px] leading-[1.33]">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] transition-colors p-2 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)]"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className={`flex-1 flex flex-col min-h-0 ${noContentScroll ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

const ModalContent = ({ children, className = '', ...props }) => (
  <div className={`px-4 sm:px-6 py-4 sm:py-6 text-[15px] font-[400] text-[var(--ln-text-secondary)] leading-[1.60] tracking-[-0.165px] ${className}`} {...props}>
    {children}
  </div>
);

const ModalFooter = ({ children, className = '', ...props }) => (
  <div className={`px-4 sm:px-6 py-4 sm:py-5 bg-[rgba(255,255,255,0.02)] border-t border-[rgba(255,255,255,0.08)] flex-shrink-0 ${className}`} {...props}>
    {children}
  </div>
);

const ModalHeader = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-5 border-b border-[rgba(255,255,255,0.08)] ${className}`} {...props}>
    {children}
  </div>
);

// Attach sub-components to Modal
Modal.Content = ModalContent;
Modal.Footer = ModalFooter;
Modal.Header = ModalHeader;

export default Modal;
