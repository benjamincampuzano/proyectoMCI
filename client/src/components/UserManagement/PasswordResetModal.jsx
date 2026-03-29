import { X, Key, WarningCircle, Copy } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';

const PasswordResetModal = ({ isOpen, onClose, user, onConfirm, submitting }) => {
    const [tempPassword, setTempPassword] = useState('');
    const [copied, setCopied] = useState(false);

    const generateTempPassword = () => {
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const nums = '0123456789';
        const syms = '!@#$%^&*+-_';
        const all = upper + lower + nums + syms;
        
        let tempPass = '';
        tempPass += upper.charAt(Math.floor(Math.random() * upper.length));
        tempPass += lower.charAt(Math.floor(Math.random() * lower.length));
        tempPass += nums.charAt(Math.floor(Math.random() * nums.length));
        tempPass += syms.charAt(Math.floor(Math.random() * syms.length));
        
        for (let i = 0; i < 8; i++) {
            tempPass += all.charAt(Math.floor(Math.random() * all.length));
        }
        
        const finalPassword = tempPass.split('').sort(() => 0.5 - Math.random()).join('');
        
        console.log('🔐 Generated temporary password:', {
            password: finalPassword,
            length: finalPassword.length,
            hasUpper: /[A-Z]/.test(finalPassword),
            hasLower: /[a-z]/.test(finalPassword),
            hasNumbers: /\d/.test(finalPassword),
            hasSymbols: /[!@#$%^&*+-_]/.test(finalPassword)
        });
        
        return finalPassword;
    };

    // Generar contraseña solo cuando se abre el modal
    useEffect(() => {
        if (isOpen && user) {
            setTempPassword(generateTempPassword());
            setCopied(false); // Resetear estado de copia al abrir modal
        }
    }, [isOpen, user]);

    // Función para copiar contraseña al portapapeles
    const copyToClipboard = async (event) => {
        // Prevenir comportamiento por defecto en eventos touch
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        try {
            await navigator.clipboard.writeText(tempPassword);
            setCopied(true);
            console.log('📋 Contraseña copiada al portapapeles:', tempPassword);
            
            // Resetear el estado después de 2 segundos
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('❌ Error al copiar contraseña:', err);
            
            // Fallback para navegadores que no soportan clipboard API
            try {
                // Crear un elemento temporal para la selección
                const textArea = document.createElement('textarea');
                textArea.value = tempPassword;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                
                // Seleccionar y copiar
                textArea.focus();
                textArea.select();
                textArea.setSelectionRange(0, 99999); // Para dispositivos móviles
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (successful) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    console.log('📋 Contraseña copiada con fallback:', tempPassword);
                } else {
                    console.error('❌ Falló el fallback de copia');
                }
            } catch (fallbackError) {
                console.error('❌ Error en fallback:', fallbackError);
                
                // Último recurso: mostrar la contraseña para copia manual
                alert(`Contraseña para copiar manualmente: ${tempPassword}`);
            }
        }
    };

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
                                <div className="flex items-center justify-between gap-2">
                                    <code className="text-sm font-mono text-gray-900 break-all flex-1">
                                        {tempPassword}
                                    </code>
                                    <button
                                        onClick={copyToClipboard}
                                        onTouchStart={(e) => {
                                            e.preventDefault();
                                        }}
                                        onTouchEnd={copyToClipboard}
                                        onTouchMove={(e) => {
                                            e.preventDefault();
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                copyToClipboard(e);
                                            }
                                        }}
                                        className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 touch-none select-none ${
                                            copied 
                                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 active:scale-95'
                                        }`}
                                        title={copied ? '¡Copiado!' : 'Copiar contraseña'}
                                        aria-label={copied ? 'Contraseña copiada' : 'Copiar contraseña al portapapeles'}
                                        type="button"
                                    >
                                        {copied ? (
                                            <>
                                                <span className="text-green-600">✓</span>
                                                Copiado
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={14} />
                                                Copiar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Esta contraseña será válida solo hasta que el usuario la cambie.
                                {copied && (
                                    <span className="text-green-600 font-medium ml-1">
                                        ¡Contraseña copiada al portapapeles!
                                    </span>
                                )}
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
