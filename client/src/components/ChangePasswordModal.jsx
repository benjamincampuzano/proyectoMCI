import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeClosedIcon, CheckCircle, XCircle, WarningIcon } from '@phosphor-icons/react';

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

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        requirements.push({ label: 'Un símbolo (!@#$%^&*)', met: true });
    } else {
        requirements.push({ label: 'Un símbolo (!@#$%^&*)', met: false });
    }

    const commonPasswords = ['password', '12345678', 'contraseña', 'iglesia', 'mci2024', 'mci2025', 'qwerty', 'admin123'];
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
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { requirements, allMet } = validatePassword(newPassword, user?.email, user?.fullName);
    const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

    useEffect(() => {
        if (isOpen) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setError('');
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
            onPasswordChanged?.();
            onClose();
        } else {
            setError(result.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
                <div className="p-6 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <WarningIcon className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Cambio de Contraseña Requerido</h2>
                            <p className="text-gray-400 text-sm">Debes cambiar tu contraseña para continuar</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Contraseña Actual
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder="Ingresa tu contraseña actual"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                                {showCurrent ? <Eye size={18} /> : <EyeClosedIcon size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Nueva Contraseña
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder="Ingresa tu nueva contraseña"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                                {showNew ? <Eye size={18} /> : <EyeClosedIcon size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Confirmar Nueva Contraseña
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder="Confirma tu nueva contraseña"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                                {showConfirm ? <Eye size={18} /> : <EyeClosedIcon size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
                        <p className="text-sm font-medium text-gray-400 mb-2">Requisitos de contraseña:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {requirements.map((req, idx) => (
                                <div key={idx} className={`flex items-center gap-2 text-xs ${req.met ? 'text-green-400' : 'text-gray-500'}`}>
                                    {req.met ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                    {req.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Password Match Indicator */}
                    {confirmPassword && (
                        <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                            {passwordsMatch ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            {passwordsMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !allMet || !passwordsMatch}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors mt-4"
                    >
                        {loading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
