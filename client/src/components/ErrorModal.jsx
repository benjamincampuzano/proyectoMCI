import { X, WarningCircle, Info, Warning, Shield } from '@phosphor-icons/react';

const ErrorModal = ({
    isOpen,
    onClose,
    title = 'Error',
    message = '',
    type = 'error'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'email':
                return <Info size={48} className="text-blue-500" />;
            case 'phone':
                return <WarningCircle size={48} className="text-orange-500" />;
            case 'document':
                return <Shield size={48} className="text-purple-500" />;
            case 'password':
                return <Warning size={48} className="text-red-500" />;
            case 'permission':
                return <Shield size={48} className="text-yellow-500" />;
            case 'server':
                return <WarningCircle size={48} className="text-red-600" />;
            default:
                return <WarningCircle size={48} className="text-red-500" />;
        }
    };

    const getIconBg = () => {
        switch (type) {
            case 'email':
                return 'bg-blue-100 dark:bg-blue-900/20';
            case 'phone':
                return 'bg-orange-100 dark:bg-orange-900/20';
            case 'document':
                return 'bg-purple-100 dark:bg-purple-900/20';
            case 'password':
                return 'bg-red-100 dark:bg-red-900/20';
            case 'permission':
                return 'bg-yellow-100 dark:bg-yellow-900/20';
            case 'server':
                return 'bg-red-100 dark:bg-red-900/20';
            default:
                return 'bg-red-100 dark:bg-red-900/20';
        }
    };

    const getSuggestions = () => {
        switch (type) {
            case 'email':
                return [
                    'Verifica que el correo electrónico esté escrito correctamente',
                    'Asegúrate de que no esté registrado por otro usuario',
                    'Intenta con otro correo electrónico si el problema persiste'
                ];
            case 'phone':
                return [
                    'Verifica que el número de teléfono esté escrito correctamente',
                    'Asegúrate de que no esté registrado por otro usuario',
                    'Intenta con otro número de teléfono si el problema persiste'
                ];
            case 'document':
                return [
                    'Verifica que el tipo y número de documento estén correctos',
                    'Asegúrate de que no esté registrado por otro usuario',
                    'Contacta al administrador si crees que es un error'
                ];
            case 'password':
                return [
                    'La contraseña debe tener al menos 8 caracteres',
                    'Debe incluir mayúsculas, minúsculas, números y símbolos',
                    'No debe contener tu nombre o correo electrónico'
                ];
            case 'permission':
                return [
                    'Verifica que tienes los permisos necesarios',
                    'Contacta al administrador del sistema',
                    'Inicia sesión nuevamente si el problema persiste'
                ];
            case 'server':
                return [
                    'Verifica tu conexión a internet',
                    'Intenta nuevamente en unos momentos',
                    'Contacta al soporte técnico si el problema persiste'
                ];
            default:
                return [
                    'Verifica los datos ingresados',
                    'Intenta nuevamente',
                    'Contacta al soporte técnico si el problema persiste'
                ];
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${getIconBg()}`}>
                            {getIcon()}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">{message}</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Sugerencias:</h4>
                        <ul className="space-y-1">
                            {getSuggestions().map((suggestion, index) => (
                                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                                    <span className="text-blue-500 mr-2">•</span>
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ErrorModal;
