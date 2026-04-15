import React from 'react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = '',
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleBackdropClick()}
      role="button"
      tabIndex={-1}
      {...props}
    >
      <div
        className={`bg-white dark:bg-[#1d1d1f] rounded-xl shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px] w-full ${sizeClasses[size]} overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {(title || showCloseButton) && (
          <div className="p-5 border-b border-[#d1d1d6] dark:border-[#3a3a3c] flex justify-between items-center">
            {title && (
              <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#272729]"
                aria-label="Cerrar modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const ModalContent = ({ children, className = '', ...props }) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

const ModalFooter = ({ children, className = '', ...props }) => (
  <div className={`p-5 bg-[#f5f5f7] dark:bg-[#272729] border-t border-[#d1d1d6] dark:border-[#3a3a3c] ${className}`} {...props}>
    {children}
  </div>
);

const ModalHeader = ({ children, className = '', ...props }) => (
  <div className={`p-5 border-b border-[#d1d1d6] dark:border-[#3a3a3c] ${className}`} {...props}>
    {children}
  </div>
);

// Attach sub-components to Modal
Modal.Content = ModalContent;
Modal.Footer = ModalFooter;
Modal.Header = ModalHeader;

export default Modal;
