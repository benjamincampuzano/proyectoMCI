import { X, WarningCircle, Info, Warning, Shield } from '@phosphor-icons/react';
import Modal from './ui/Modal';

const ErrorModal = ({
    isOpen,
    onClose,
    title = 'Notificación del Sistema',
    message = '',
    type = 'error'
}) => {
    const getIconData = () => {
        switch (type) {
            case 'email':
                return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
            case 'phone':
                return { icon: WarningCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
            case 'document':
                return { icon: Shield, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
            case 'password':
                return { icon: Warning, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
            case 'permission':
                return { icon: Shield, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
            case 'server':
                return { icon: Shield, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/20' };
            default:
                return { icon: WarningCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
        }
    };

    const iconData = getIconData();
    const Icon = iconData.icon;

    const getSuggestions = () => {
        switch (type) {
            case 'email':
                return ['Verifica la ortografía del correo', 'Asegúrate de que no esté registrado', 'Intenta con una cuenta alternativa'];
            case 'phone':
                return ['Verifica el formato del número', 'Confirma que no esté en uso', 'Prueba con otro contacto'];
            case 'document':
                return ['Verifica tipo y número de documento', 'Confirma los datos legales', 'Contacta al administrador'];
            case 'password':
                return ['Mínimo 8 caracteres', 'Usa mayúsculas, números y símbolos', 'Evita secuencias predecibles'];
            case 'permission':
                return ['Verifica tu nivel de acceso', 'Solicita permisos a un administrador', 'Reinicia sesión para actualizar roles'];
            case 'server':
                return ['Verifica tu conectividad', 'Intenta nuevamente en un momento', 'Consulta el estado del servicio'];
            default:
                return ['Verifica los datos obligatorios', 'Revisa el formulario', 'Contacta a soporte técnico'];
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
                <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className={`p-5 ${iconData.bg} ${iconData.border} border rounded-[24px] mb-6 shadow-sm`}>
                        <Icon size={40} weight="bold" className={iconData.color} />
                    </div>

                    <h4 className="text-[17px] weight-590 text-[var(--ln-text-primary)] mb-3 tracking-tight">
                        {message}
                    </h4>

                    <div className="w-full bg-[var(--ln-bg-panel)]/50 border border-[var(--ln-border-standard)] rounded-2xl p-5 mb-8 text-left">
                        <p className="text-[10px] weight-590 text-[var(--ln-text-quaternary)] uppercase tracking-widest mb-4">Recomendaciones</p>
                        <ul className="space-y-3">
                            {getSuggestions().map((suggestion, index) => (
                                <li key={index} className="text-[13px] weight-510 text-[var(--ln-text-secondary)] flex items-start gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${iconData.color.replace('text-', 'bg-')}`} />
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Modal.Content>

            <Modal.Footer className="flex justify-center p-8 pt-0">
                <button
                    onClick={onClose}
                    className="w-full bg-[var(--ln-text-primary)] text-[var(--ln-bg-surface)] py-3 rounded-xl weight-590 text-sm hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-black/10"
                >
                    Entendido
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default ErrorModal;
