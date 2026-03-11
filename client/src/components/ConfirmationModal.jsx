import { useState } from 'react';
import { WarningIcon, X } from '@phosphor-icons/react';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmar Acción",
    message = "¿Estás seguro de realizar esta acción?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    confirmButtonClass = "bg-red-600 hover:bg-red-700 text-white",
    icon: Icon = WarningIcon,
    iconColor = "text-red-600 dark:text-red-400",
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                        <Icon size={24} className={iconColor} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {message}
                        </p>
                    </div>
                </div>

                {children && (
                    <div className="mb-6">
                        {children}
                    </div>
                )}

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
                    Esta acción no se puede deshacer.
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isConfirming}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isConfirming}
                        className={`px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 ${confirmButtonClass}`}
                    >
                        {isConfirming ? 'Procesando...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
