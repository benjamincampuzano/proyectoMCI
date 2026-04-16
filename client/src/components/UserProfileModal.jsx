import { useState, useEffect } from 'react';
import { X, FloppyDisk, Spinner, Check } from '@phosphor-icons/react';
import { validatePassword, getPasswordStrength } from '../utils/passwordValidator';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const UserProfileModal = ({ isOpen, onClose }) => {
    const { user, updateProfile } = useAuth();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        documentType: '',
        documentNumber: '',
        birthDate: '',
        phone: '',
        address: '',
        city: '',
        sex: 'HOMBRE',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPasswordFields, setShowPasswordFields] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users/profile');
            const userData = res.data.user;
            setFormData({
                fullName: userData.fullName || '',
                email: userData.email || '',
                documentType: userData.documentType || '',
                documentNumber: userData.documentNumber || '',
                birthDate: userData.birthDate ? userData.birthDate.split('T')[0] : '',
                phone: userData.phone || '',
                address: userData.address || '',
                city: userData.city || '',
                sex: userData.sex || 'HOMBRE',
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            if (JSON.stringify(userData) !== JSON.stringify(user)) {
                localStorage.setItem('user', JSON.stringify(userData));
                updateProfile(userData);
            }
        } catch (err) {
            if (user) {
                setFormData(prev => ({
                    ...prev,
                    fullName: user.fullName || '',
                    email: user.email || '',
                    documentType: user.documentType || '',
                    documentNumber: user.documentNumber || '',
                    birthDate: user.birthDate ? user.birthDate.split('T')[0] : '',
                    phone: user.phone || '',
                    address: user.address || '',
                    city: user.city || '',
                    sex: user.sex || 'HOMBRE',
                }));
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const res = await api.put(
                '/users/profile',
                {
                    fullName: formData.fullName,
                    email: formData.email,
                    documentType: formData.documentType,
                    documentNumber: formData.documentNumber,
                    birthDate: formData.birthDate,
                    phone: formData.phone,
                    address: formData.address,
                    city: formData.city,
                    sex: formData.sex,
                }
            );

            const updatedUser = res.data.user;
            localStorage.setItem('user', JSON.stringify(updatedUser));
            updateProfile(updatedUser);

            setSuccess('Perfil actualizado exitosamente');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al actualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            setLoading(false);
            return;
        }

        const validation = validatePassword(formData.newPassword, { email: formData.email, fullName: formData.fullName });
        if (!validation.isValid) {
            setError(validation.message);
            setLoading(false);
            return;
        }

        try {
            await api.put(
                '/users/password',
                {
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword,
                }
            );

            setSuccess('Contraseña cambiada exitosamente');
            setFormData({
                ...formData,
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            setShowPasswordFields(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cambiar contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[4px] flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-[var(--ln-bg-panel)]/95 backdrop-blur-xl rounded-[24px] shadow-2xl w-full max-w-4xl border border-[var(--ln-border-standard)] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--ln-border-standard)] bg-white/5">
                    <div>
                        <h2 className="text-2xl weight-590 text-[var(--ln-text-primary)] tracking-tight">Mi Perfil</h2>
                        <p className="text-[13px] text-[var(--ln-text-tertiary)] mt-1 opacity-70">Gestiona tu información personal y seguridad.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/10 transition-all active:scale-95"
                    >
                        <X size={20} weight="bold" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                    <div className="max-w-3xl mx-auto space-y-10">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-[13px] font-medium animate-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-xl text-[13px] font-medium animate-in slide-in-from-top-2">
                                {success}
                            </div>
                        )}

                        {/* Profile Form */}
                        <form onSubmit={handleUpdateProfile} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest ml-1">Tipo de Documento</label>
                                    <select
                                        name="documentType"
                                        value={formData.documentType}
                                        onChange={handleChange}
                                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm appearance-none"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="RC">RC</option>
                                        <option value="TI">TI</option>
                                        <option value="CC">CC</option>
                                        <option value="CE">CE</option>
                                        <option value="PP">PPT</option>
                                        <option value="PEP">PEP</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest ml-1">Número de Documento</label>
                                    <input
                                        type="text"
                                        name="documentNumber"
                                        value={formData.documentNumber || ''}
                                        onChange={handleChange}
                                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm"
                                        placeholder="12345678"
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest ml-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm"
                                        placeholder="Nombre y Apellido"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest ml-1">Fecha de Nacimiento</label>
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={formData.birthDate || ''}
                                        onChange={handleChange}
                                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest ml-1">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest ml-1">Teléfono</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm"
                                        placeholder="+57 321..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest ml-1">Sexo</label>
                                    <select
                                        name="sex"
                                        value={formData.sex}
                                        onChange={handleChange}
                                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm appearance-none"
                                    >
                                        <option value="HOMBRE">Hombre</option>
                                        <option value="MUJER">Mujer</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest ml-1">Dirección</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm"
                                        placeholder="Calle 123..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest ml-1">Ciudad</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm"
                                        placeholder="Bogotá"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-2.5 bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-accent-hover)] text-white rounded-xl weight-510 transition-all shadow-lg shadow-[var(--ln-brand-indigo)]/20 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2.5"
                                >
                                    {loading ? <Spinner size={18} className="animate-spin" /> : <FloppyDisk size={18} />}
                                    <span>Guardar Cambios</span>
                                </button>
                            </div>
                        </form>

                        {/* Password Change Section */}
                        <div className="border-t border-[var(--ln-border-standard)] pt-10">
                            {!showPasswordFields ? (
                                <button
                                    onClick={() => setShowPasswordFields(true)}
                                    className="text-[13px] weight-510 text-[var(--ln-brand-indigo)] hover:text-[var(--ln-accent-hover)] transition-colors flex items-center gap-2 group"
                                >
                                    <Check size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    ¿Deseas cambiar tu contraseña?
                                </button>
                            ) : (
                                <form onSubmit={handleChangePassword} className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg weight-590 text-[var(--ln-text-primary)]">Cambiar Contraseña</h3>
                                        <button 
                                            type="button"
                                            onClick={() => setShowPasswordFields(false)}
                                            className="text-[12px] text-[var(--ln-text-tertiary)] hover:text-red-500 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest ml-1">Contraseña Actual</label>
                                            <input
                                                type="password"
                                                name="currentPassword"
                                                value={formData.currentPassword}
                                                onChange={handleChange}
                                                className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest ml-1">Nueva Contraseña</label>
                                            <input
                                                type="password"
                                                name="newPassword"
                                                value={formData.newPassword}
                                                onChange={handleChange}
                                                className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm"
                                                required
                                            />
                                            {formData.newPassword && (
                                                <div className="mt-3 px-1 animate-in fade-in">
                                                    <div className="flex gap-1 mb-2">
                                                        {[...Array(4)].map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < getPasswordStrength(formData.newPassword)
                                                                    ? ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'][getPasswordStrength(formData.newPassword) - 1]
                                                                    : 'bg-white/5 border border-white/5'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Requirement label="8+ caracteres" met={formData.newPassword.length >= 8} />
                                                        <Requirement label="Mayús/Minús" met={/[A-Z]/.test(formData.newPassword) && /[a-z]/.test(formData.newPassword)} />
                                                        <Requirement label="Números" met={/\d/.test(formData.newPassword)} />
                                                        <Requirement label="Símbolos" met={/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword)} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 py-2.5 bg-white/5 border border-[var(--ln-border-standard)] hover:bg-white/10 text-[var(--ln-text-primary)] rounded-xl weight-510 transition-all active:scale-[0.98] disabled:opacity-50"
                                        >
                                            Actualizar Contraseña
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Requirement = ({ label, met }) => (
    <div className={`flex items-center gap-1.5 ${met ? 'text-emerald-500' : 'text-[var(--ln-text-tertiary)] opacity-30'} transition-all`}>
        {met ? <Check size={12} weight="bold" /> : <X size={12} weight="bold" className="opacity-50" />}
        <span className="text-[10px] weight-510 tracking-wide">{label}</span>
    </div>
);

export default UserProfileModal;
