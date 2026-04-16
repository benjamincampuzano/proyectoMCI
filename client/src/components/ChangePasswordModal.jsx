import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeClosedIcon, CheckCircle, XCircle, WarningCircle } from '@phosphor-icons/react';

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
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
            <div className="w-full max-w-md rounded-lg shadow-2xl border p-6" style={{ backgroundColor: '#0f1011', borderColor: 'rgba(255,255,255,0.08)', boxShadow: 'rgba(0,0,0,0) 0px 8px 2px, rgba(0,0,0,0.01) 0px 5px 2px, rgba(0,0,0,0.04) 0px 3px 2px, rgba(0,0,0,0.07) 0px 1px 1px, rgba(0,0,0,0.08) 0px 0px 1px' }}>
                <div className="pb-4 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(122,127,173,0.15)' }}>
                            <WarningCircle className="w-6 h-6" style={{ color: '#7a7fad' }} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold" style={{ color: '#f7f8f8', fontFamily: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue', fontFeatureSettings: '"cv01", "ss03"', fontWeight: 590, letterSpacing: '-0.288px' }}>Cambio de Contraseña Requerido</h2>
                            <p className="text-sm" style={{ color: '#8a8f98', fontFamily: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue', fontFeatureSettings: '"cv01", "ss03"', fontWeight: 400 }}>*</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg text-sm border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', color: '#f7f8f8' }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm mb-2" style={{ color: '#d0d6e0', fontFamily: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue', fontFeatureSettings: '"cv01", "ss03"', fontWeight: 510 }}>
                            Contraseña Actual
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: '#62666d' }} />
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-10 py-3 rounded-lg focus:outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', color: '#d0d6e0', fontFamily: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue', fontFeatureSettings: '"cv01", "ss03"', fontWeight: 400 }}
                                placeholder="Ingresa tu contraseña actual"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70"
                                style={{ color: '#62666d' }}
                            >
                                {showCurrent ? <Eye size={18} /> : <EyeClosedIcon size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm mb-2" style={{ color: '#d0d6e0', fontFamily: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue', fontFeatureSettings: '"cv01", "ss03"', fontWeight: 510 }}>
                            Nueva Contraseña
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: '#62666d' }} />
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-10 py-3 rounded-lg focus:outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', color: '#d0d6e0', fontFamily: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue', fontFeatureSettings: '"cv01", "ss03"', fontWeight: 400 }}
                                placeholder="Ingresa tu nueva contraseña"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70"
                                style={{ color: '#62666d' }}
                            >
                                {showNew ? <Eye size={18} /> : <EyeClosedIcon size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm mb-2" style={{ color: '#d0d6e0', fontFamily: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue', fontFeatureSettings: '"cv01", "ss03"', fontWeight: 510 }}>
                            Confirmar Nueva Contraseña
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: '#62666d' }} />
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-10 py-3 rounded-lg focus:outline-none"
                                style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', color: '#d0d6e0', fontFamily: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue', fontFeatureSettings: '"cv01", "ss03"', fontWeight: 400 }}
                                placeholder="Confirma tu nueva contraseña"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70"
                                style={{ color: '#62666d' }}
                            >
                                {showConfirm ? <Eye size={18} /> : <EyeClosedIcon size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Password Requirements */}
                    <div className="rounded-lg p-4 space-y-2" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-sm mb-2" style={{ color: '#d0d6e0', fontFamily: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue', fontFeatureSettings: '"cv01", "ss03"', fontWeight: 510 }}>Requisitos de contraseña:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {requirements.map((req, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs" style={{ color: req.met ? '#10b981' : '#62666d', fontFamily: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue', fontFeatureSettings: '"cv01", "ss03"', fontWeight: 400 }}>
                                    {req.met ? <CheckCircle size={14} style={{ color: '#10b981' }} /> : <XCircle size={14} style={{ color: '#62666d' }} />}
                                    {req.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Password Match Indicator */}
                    {confirmPassword && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: passwordsMatch ? '#10b981' : '#62666d', fontFamily: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue', fontFeatureSettings: '"cv01", "ss03"', fontWeight: 400 }}>
                            {passwordsMatch ? <CheckCircle size={16} style={{ color: '#10b981' }} /> : <XCircle size={16} style={{ color: '#62666d' }} />}
                            {passwordsMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !allMet || !passwordsMatch}
                        className="w-full py-3 rounded-lg transition-colors mt-4 font-medium"
                        style={{ backgroundColor: loading || !allMet || !passwordsMatch ? 'rgba(255,255,255,0.05)' : '#5e6ad2', color: '#f7f8f8', fontFamily: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue', fontFeatureSettings: '"cv01", "ss03"', fontWeight: 510, cursor: loading || !allMet || !passwordsMatch ? 'not-allowed' : 'pointer', opacity: loading || !allMet || !passwordsMatch ? 0.5 : 1 }}
                        onMouseEnter={(e) => { if (!loading && allMet && passwordsMatch) e.target.style.backgroundColor = '#828fff'; }}
                        onMouseLeave={(e) => { if (!loading && allMet && passwordsMatch) e.target.style.backgroundColor = '#5e6ad2'; }}
                    >
                        {loading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
