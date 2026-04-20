import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Lock, Eye, EyeClosedIcon, CheckCircle, WarningCircle, ShieldCheck } from '@phosphor-icons/react';

const validatePassword = (password, email = '', fullName = '') => {
    const requirements = [];

    if (password.length >= 8) {
        requirements.push({ label: 'Al menos 8 caracteres', met: true });
    } else {
        requirements.push({ label: 'Al menos 8 caracteres', met: false });
    }

    if (/[A-Z]/.test(password)) {
        requirements.push({ label: 'Una letra mayúscula', met: true });
    } else {
        requirements.push({ label: 'Una letra mayúscula', met: false });
    }

    if (/[a-z]/.test(password)) {
        requirements.push({ label: 'Una letra minúscula', met: true });
    } else {
        requirements.push({ label: 'Una letra minúscula', met: false });
    }

    if (/\d/.test(password)) {
        requirements.push({ label: 'Un número', met: true });
    } else {
        requirements.push({ label: 'Un número', met: false });
    }

    if (/[!@#$%^&*(),.?":{}|<>+\-_]/.test(password)) {
        requirements.push({ label: 'Un símbolo (!@#$%^&*+-_)', met: true });
    } else {
        requirements.push({ label: 'Un símbolo (!@#$%^&*+-_)', met: false });
    }

    const commonPasswords = ['password', '12345678', 'contraseña', 'iglesia', 'mci2024', 'mci2025',
    'qwerty', 'admin123', 'godisgood', 'jesus123'];
    if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
        requirements.push({ label: 'No ser una contraseña común', met: false });
    } else {
        requirements.push({ label: 'No ser una contraseña común', met: true });
    }

    if (email) {
        const emailPart = email.split('@')[0].toLowerCase();
        if (emailPart.length > 3 && password.toLowerCase().includes(emailPart)) {
            requirements.push({ label: 'No contener tu correo', met: false });
        }
    }

    const allMet = requirements.every(r => r.met);
    return { requirements, allMet };
};

const ChangePasswordModal = ({ isOpen, onClose, onPasswordChanged }) => {
    const { user, changePassword } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const { requirements, allMet } = validatePassword(newPassword, user?.email, user?.fullName);
    const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

    useEffect(() => {
        if (isOpen) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setError('');
            setSuccess(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!allMet) {
            setError('La nueva contraseña no cumple con todos los requisitos');
            return;
        }

        if (!passwordsMatch) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (currentPassword === newPassword) {
            setError('La nueva contraseña debe ser diferente a la actual');
            return;
        }

        setLoading(true);
        const result = await changePassword(currentPassword, newPassword);
        setLoading(false);

        if (result.success) {
            setSuccess(true);
            onPasswordChanged?.();
            setTimeout(() => {
                onClose();
            }, 3000);
        } else {
            setError(result.message);
        }
    };

    if (!isOpen && !success) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-300">
                <div className="px-6 py-8">
                    {!success ? (
                        <>
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 mb-4 ring-8 ring-blue-50 dark:ring-blue-900/10">
                                    <ShieldCheck size={40} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Cambio de Contraseña
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    Actualiza tu contraseña para mantener tu cuenta segura.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2 border border-red-200 dark:border-red-800 animate-in shake duration-300">
                                        <WarningCircle size={18} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                                        Contraseña Actual
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pl-11 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                                            placeholder="Ingresa tu clave actual"
                                            required
                                        />
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                        >
                                            {showPasswords ? <EyeClosedIcon size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                                        Nueva Contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pl-11 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                                            placeholder="Crea una clave segura"
                                            required
                                        />
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                                        Confirmar Nueva Contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pl-11 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                                            placeholder="Repite la nueva clave"
                                            required
                                        />
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    </div>

                                    {confirmPassword && (
                                        <div className="flex items-center gap-2 text-sm mt-2" style={{ color: passwordsMatch ? '#10b981' : '#62666d' }}>
                                            {passwordsMatch ? <CheckCircle size={16} /> : <WarningCircle size={16} />}
                                            {passwordsMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                                        </div>
                                    )}

                                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-2 border border-gray-100 dark:border-gray-800">
                                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Requisitos:</p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {requirements.map((req, idx) => (
                                                <div key={idx} className={`flex items-center gap-2 text-[11px] ${req.met ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${req.met ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                                        <CheckCircle size={10} weight={req.met ? "bold" : "regular"} />
                                                    </div>
                                                    {req.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !allMet || !passwordsMatch}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none flex items-center justify-center gap-2 mt-4"
                                >
                                    {loading ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'Cambiar Contraseña'
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-col items-center text-center py-8 animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-6 scale-110">
                                <CheckCircle size={48} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                ¡Éxito!
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-2">
                                Tu contraseña ha sido actualizada correctamente.
                            </p>
                            <p className="text-sm text-blue-600 font-medium">
                                Redireccionando en unos segundos...
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;