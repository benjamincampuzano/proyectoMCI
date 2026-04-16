import { useState } from 'react';
import { Warning, X } from '@phosphor-icons/react';
import Modal from './ui/Modal';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmar Acción",
    message = "¿Estás seguro de realizar esta acción?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    confirmButtonClass = "bg-red-500 hover:bg-red-600",
    icon: Icon = Warning,
    iconColor = "text-red-500",
    children
}) => {
    const [isConfirming, setIsConfirming] = useState(false);

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error('Error en confirmación:', error);
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
        >
            <Modal.Content>
                <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 mb-6 group-hover:scale-110 transition-transform">
                        <Icon size={32} weight="bold" className={iconColor} />
                    </div>
                    
                    <p className="text-[15px] weight-510 text-[var(--ln-text-secondary)] leading-relaxed mb-6">
                        {message}
                    </p>

                    {children && (
                        <div className="w-full bg-[var(--ln-bg-panel)]/50 border border-[var(--ln-border-standard)] rounded-xl p-4 mb-6 text-left">
                            {children}
                        </div>
                    )}

                    <p className="text-[11px] weight-590 text-[var(--ln-text-quaternary)] uppercase tracking-widest mb-4">
                        Esta acción no se puede deshacer
                    </p>
                </div>
            </Modal.Content>

            <Modal.Footer className="flex justify-end gap-3">
                <button
                    onClick={onClose}
                    disabled={isConfirming}
                    className="px-4 py-2 text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] weight-510 text-sm transition-all disabled:opacity-50"
                >
                    {cancelText}
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    className={`px-6 py-2 rounded-lg text-white weight-590 text-sm transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-red-500/20 ${confirmButtonClass}`}
                >
                    {isConfirming ? 'Procesando...' : confirmText}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default ConfirmationModal;
