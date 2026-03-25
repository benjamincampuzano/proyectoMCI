import { X, Key, WarningCircle } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';

const PasswordResetModal = ({ isOpen, onClose, user, onConfirm, submitting }) => {
    const [tempPassword, setTempPassword] = useState('');

    const generateTempPassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(),.?":{}|<>';
        let tempPass = '';
        // Generar 12 caracteres para asegurar longitud suficiente
        for (let i = 0; i < 12; i++) {
            tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Asegurar que tenga al menos una mayúscula, minúscula, número y símbolo válido
        const hasUpperCase = /[A-Z]/.test(tempPass);
        const hasLowerCase = /[a-z]/.test(tempPass);
        const hasNumbers = /\d/.test(tempPass);
        const hasValidSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(tempPass);
        
        if (!hasUpperCase) tempPass = 'A' + tempPass.slice(1);
        if (!hasLowerCase) tempPass = 'a' + tempPass.slice(1);
        if (!hasNumbers) tempPass = '1' + tempPass.slice(1);
        if (!hasValidSymbols) tempPass = '!' + tempPass.slice(1);
        
        return tempPass.slice(0, 12); // Asegurar longitud exacta de 12
    };

    // Generar contraseña solo cuando se abre el modal
    useEffect(() => {
        if (isOpen && user) {
            setTempPassword(generateTempPassword());
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(user, tempPassword);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <Key className="text-orange-600" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Resetear Contraseña</h3>
                            <p className="text-sm text-gray-500">Generar contraseña temporal</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                            <WarningCircle className="text-orange-600 mt-0.5" size={18} />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-orange-800 mb-1">
                                    Estás a punto de resetear la contraseña de:
                                </p>
                                <p className="text-sm text-orange-700">
                                    <span className="font-semibold">{user?.fullName}</span>
                                    <br />
                                    <span className="text-xs">{user?.email}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contraseña temporal generada:
                            </label>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <code className="text-sm font-mono text-gray-900 break-all">
                                    {tempPassword}
                                </code>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Esta contraseña será válida solo hasta que el usuario la cambie.
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                                <span className="font-semibold">Importante:</span> El usuario deberá cambiar esta contraseña 
                                en su próximo inicio de sesión.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Resetenando...
                            </>
                        ) : (
                            <>
                                <Key size={16} />
                                Resetear Contraseña
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PasswordResetModal;
