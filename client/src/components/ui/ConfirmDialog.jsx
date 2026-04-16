import React from 'react';
import Modal from './Modal';
import { Warning, X } from '@phosphor-icons/react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger', // danger, warning, info
  loading = false
}) => {
  const variantStyles = {
    danger: {
      icon: <X size={22} className="text-red-500" />,
      bg: 'bg-red-500/10 dark:bg-red-500/15',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      icon: <Warning size={22} className="text-amber-500" />,
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      button: 'bg-amber-600 hover:bg-amber-700 text-white'
    },
    info: {
      icon: <Warning size={22} className="text-[var(--ln-brand-indigo)]" />,
      bg: 'bg-[var(--ln-brand-indigo)]/10 dark:bg-[var(--ln-brand-indigo)]/15',
      button: 'bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-accent-hover)] text-white'
    }
  };

  const style = variantStyles[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <Modal.Content className="pt-10 pb-4">
        <div className="flex flex-col items-center text-center">
          <div className={`p-4 rounded-full mb-5 ${style.bg} transition-colors`}>
            {style.icon}
          </div>
          <h3 className="text-[18px] weight-590 text-[var(--ln-text-primary)] mb-2 tracking-tight">
            {title}
          </h3>
          <p className="text-[14px] text-[var(--ln-text-secondary)] leading-relaxed px-2">
            {message}
          </p>
        </div>
      </Modal.Content>
      <Modal.Footer className="bg-transparent border-t-0 pt-0 pb-8">
        <div className="flex flex-col sm:flex-row gap-3 px-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] rounded-lg transition-all font-medium text-[13px]"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-lg transition-all font-medium text-[13px] shadow-sm ${style.button} ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Procesando...</span>
              </div>
            ) : confirmText}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmDialog;
