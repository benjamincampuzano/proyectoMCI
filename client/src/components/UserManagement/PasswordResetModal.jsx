import { X, Key, Warning, Copy, CheckCircle, Spinner } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import ActionModal from '../ActionModal';
import { Button } from '../ui';
import PropTypes from 'prop-types';

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
        
        return tempPass.split('').sort(() => 0.5 - Math.random()).join('');
    };

    useEffect(() => {
        if (isOpen && user) {
            setTempPassword(generateTempPassword());
            setCopied(false);
        }
    }, [isOpen, user]);

    const copyToClipboard = async (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        try {
            await navigator.clipboard.writeText(tempPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('❌ Error al copiar contraseña:', err);
            // Fallback
            try {
                const textArea = document.createElement('textarea');
                textArea.value = tempPassword;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                }
            } catch (fallbackError) {
                console.error('❌ Error en fallback:', fallbackError);
            }
        }
    };

    const handleConfirm = () => {
        onConfirm(user, tempPassword);
    };

    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            title="Resetear Contraseña"
            containerClassName="max-w-md"
        >
            <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh]">
                {/* Warning Alert */}
                <div className="bg-red-500/[0.03] border border-red-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                        <Warning size={22} weight="bold" />
                    </div>
                    <div>
                        <p className="text-[13.5px] weight-590 text-red-200/150 leading-tight mb-1">
                            Acción irreversible para el usuario
                        </p>
                        <p className="text-[12px] weight-510 text-red-200/150 leading-relaxed italic">
                            Estás asignando una clave temporal a <span className="text-red-200/150 weight-700">{user?.fullName}</span> ({user?.email}).
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[11px] weight-700 text-[var(--ln-text-quaternary)] uppercase tracking-widest px-1">
                            Contraseña Temporal Generada
                        </label>
                        <div className="relative group/copy">
                            <div className="w-full bg-[var(--ln-bg-panel)]/50 border border-[var(--ln-border-standard)] rounded-2xl p-6 font-mono text-[18px] weight-700 text-[var(--ln-text-primary)] tracking-wider shadow-inner text-center backdrop-blur-sm group-hover/copy:border-[var(--ln-brand-indigo)]/50 transition-all duration-300">
                                {tempPassword}
                            </div>
                            
                            <button
                                type="button"
                                onClick={copyToClipboard}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-[12px] weight-700 flex items-center gap-2 transition-all duration-300 shadow-xl ${
                                    copied 
                                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                                        : 'bg-[var(--ln-brand-indigo)] text-white hover:bg-[var(--ln-brand-indigo-hover)] opacity-0 group-hover/copy:opacity-100'
                                }`}
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle size={16} weight="bold" />
                                        Copiado
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} weight="bold" />
                                        Copiar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="bg-[var(--ln-brand-indigo)]/5 border border-[var(--ln-brand-indigo)]/10 rounded-2xl p-5 flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-[var(--ln-brand-indigo)] animate-pulse shadow-[0_0_8px_var(--ln-brand-indigo)]" />
                        <p className="text-[12.5px] weight-510 text-[var(--ln-text-secondary)]">
                            El usuario será obligado a cambiar esta clave en su próximo inicio de sesión.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-4 p-6 bg-[var(--ln-bg-panel)] border-t border-[var(--ln-border-standard)] rounded-b-2xl">
                <Button
                    variant="ghost"
                    onClick={onClose}
                    disabled={submitting}
                >
                    Cancelar
                </Button>
                <Button
                    variant="primary"
                    onClick={handleConfirm}
                    disabled={submitting}
                    icon={submitting ? Spinner : Key}
                    className={submitting ? 'animate-pulse' : 'bg-orange-600 hover:bg-orange-700 border-orange-500/20'}
                >
                    {submitting ? 'Reseteando...' : 'Confirmar Reset'}
                </Button>
            </div>
        </ActionModal>
    );
};

PasswordResetModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    user: PropTypes.object,
    onConfirm: PropTypes.func.isRequired,
    submitting: PropTypes.bool
};

export default PasswordResetModal;
