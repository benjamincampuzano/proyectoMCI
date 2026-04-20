import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock, User, Phone, MapPin, ShieldCheck, ArrowRight, Check, X as XIcon, Envelope } from '@phosphor-icons/react';
import { validatePassword, getPasswordStrength } from '../utils/passwordValidator';
import toast from 'react-hot-toast';

const SetupWizard = () => {
    const [formData, setFormData] = useState({
        documentType: '',
        documentNumber: '',
        fullName: '',
        birthDate: '',
        email: '',
        password: '',
        sex: '',
        phone: '',
        address: '',
        city: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setup, isInitialized, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const isFormDisabled = () => {
        return authLoading || isInitialized;
    };

    useEffect(() => {
        if (isInitialized) {
            navigate('/login');
        }
    }, [isInitialized, navigate]);

    useEffect(() => {
        const checkInitialization = async () => {
            try {
                const response = await fetch('/api/auth/init-status');
                const data = await response.json();
                if (data.isInitialized) {
                    navigate('/login');
                }
            } catch (error) {
                console.error('Error checking initialization:', error);
            }
        };
        
        if (!authLoading) {
            checkInitialization();
        }
    }, [authLoading, navigate]);

    if (!authLoading && isInitialized) {
        return <Navigate to="/login" replace />;
    }

    if (authLoading) {
        return (
            <div className="min-h-[100dvh] bg-[var(--ln-bg-marketing)] flex items-center justify-center p-4">
                <div className="w-10 h-10 border-3 border-[var(--ln-brand-indigo)]/30 border-t-[var(--ln-brand-indigo)] rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const validation = validatePassword(formData.password, {
            email: formData.email,
            fullName: formData.fullName
        });

        if (!validation.isValid) {
            setError(validation.message);
            setLoading(false);
            return;
        }

        const result = await setup(formData);
        if (result.success) {
            toast.success('¡Sistema configurado exitosamente!');
            navigate('/');
        } else {
            const errorMessage = result.message.toLowerCase();
            if (errorMessage.includes('teléfono')) toast.error('El número de teléfono ya está registrado.');
            else if (errorMessage.includes('correo')) toast.error('El correo electrónico ya está registrado.');
            else if (errorMessage.includes('documento')) toast.error('El número de documento ya está registrado.');
            else toast.error(result.message || 'Error al configurar el sistema.');
            
            setError(result.message);
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-[100dvh] bg-[var(--ln-bg-marketing)] flex items-center justify-center p-6 antialiased">
            <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-brand-indigo)] rounded-3xl mb-6 shadow-sm border border-[var(--ln-brand-indigo)]/20">
                        <ShieldCheck size={40} weight="duotone" />
                    </div>
                    <h2 className="text-4xl weight-590 text-[var(--ln-text-primary)] tracking-tight mb-3">Configuración Inicial</h2>
                    <p className="text-[15px] text-[var(--ln-text-secondary)] opacity-80 max-w-lg mx-auto leading-relaxed">Configura la cuenta raíz del administrador para activar el sistema MCI.</p>
                </div>

                <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-md border border-[var(--ln-border-standard)] rounded-3xl shadow-2xl overflow-hidden">
                    {error && (
                        <div className="bg-red-500/10 border-b border-red-500/20 text-red-500 p-4 text-[13px] font-medium text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-10 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            {/* Personal Info Group */}
                            <div className="space-y-6">
                                <h3 className="text-[12px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] border-b border-[var(--ln-border-standard)] pb-3 mb-6">Información Personal</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase ml-1">Tipo Doc.</label>
                                        <select
                                            name="documentType"
                                            value={formData.documentType}
                                            onChange={handleChange}
                                            disabled={isFormDisabled()}
                                            className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm disabled:opacity-50"
                                        >
                                            <option value="">Sel...</option>
                                            <option value="RC">RC</option>
                                            <option value="TI">TI</option>
                                            <option value="CC">CC</option>
                                            <option value="CE">CE</option>
                                            <option value="PP">PPT</option>
                                            <option value="PEP">PEP</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase ml-1">Número Doc.</label>
                                        <input
                                            name="documentNumber"
                                            type="text"
                                            value={formData.documentNumber}
                                            onChange={handleChange}
                                            disabled={isFormDisabled()}
                                            className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm disabled:opacity-50"
                                            placeholder="123456..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase ml-1">Nombre Completo</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ln-text-tertiary)] group-focus-within:text-[var(--ln-brand-indigo)] transition-colors" size={18} />
                                        <input
                                            name="fullName"
                                            type="text"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            disabled={isFormDisabled()}
                                            className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm disabled:opacity-50"
                                            placeholder="Nombre Apellido"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase ml-1">Nacimiento</label>
                                        <input
                                            name="birthDate"
                                            type="date"
                                            value={formData.birthDate}
                                            onChange={handleChange}
                                            disabled={isFormDisabled()}
                                            className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase ml-1">Sexo</label>
                                        <select
                                            name="sex"
                                            value={formData.sex}
                                            onChange={handleChange}
                                            disabled={isFormDisabled()}
                                            className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm disabled:opacity-50"
                                        >
                                            <option value="">Selección</option>
                                            <option value="HOMBRE">Hombre</option>
                                            <option value="MUJER">Mujer</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Credentials & Contact Group */}
                            <div className="space-y-6">
                                <h3 className="text-[12px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] border-b border-[var(--ln-border-standard)] pb-3 mb-6">Credenciales de Acceso</h3>
                                
                                <div className="space-y-2">
                                    <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase ml-1">Email Principal</label>
                                    <div className="relative group">
                                        <Envelope className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ln-text-tertiary)] group-focus-within:text-[var(--ln-brand-indigo)] transition-colors" size={18} />
                                        <input
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            disabled={isFormDisabled()}
                                            className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm disabled:opacity-50"
                                            placeholder="admin@mci.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase ml-1">Contraseña Administrador</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ln-text-tertiary)] group-focus-within:text-[var(--ln-brand-indigo)] transition-colors" size={18} />
                                        <input
                                            name="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            disabled={isFormDisabled()}
                                            className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm disabled:opacity-50"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                    {formData.password && (
                                        <div className="mt-3 px-1 animate-in fade-in duration-300">
                                            <div className="flex gap-1.5 mb-2">
                                                {[...Array(4)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < getPasswordStrength(formData.password)
                                                            ? ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'][getPasswordStrength(formData.password) - 1]
                                                            : 'bg-white/5 border border-white/5'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Requirement label="8+ caracteres" met={formData.password.length >= 8} />
                                                <Requirement label="Mayús/Minús" met={/[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password)} />
                                                <Requirement label="Números" met={/\d/.test(formData.password)} />
                                                <Requirement label="Símbolos" met={/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-[var(--ln-border-standard)]">
                                    <div className="space-y-2">
                                        <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase ml-1">Teléfono</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ln-text-tertiary)]" size={18} />
                                            <input
                                                name="phone"
                                                type="text"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                disabled={isFormDisabled()}
                                                className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm disabled:opacity-50"
                                                placeholder="+57 321..."
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase ml-1">Dirección</label>
                                            <input
                                                name="address"
                                                type="text"
                                                value={formData.address}
                                                onChange={handleChange}
                                                disabled={isFormDisabled()}
                                                className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm disabled:opacity-50"
                                                placeholder="Calle..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase ml-1">Ciudad</label>
                                            <input
                                                name="city"
                                                type="text"
                                                value={formData.city}
                                                onChange={handleChange}
                                                disabled={isFormDisabled()}
                                                className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm disabled:opacity-50"
                                                placeholder="Bogotá"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center pt-8">
                            <button
                                type="submit"
                                disabled={loading || isFormDisabled()}
                                className="w-full max-w-md bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-accent-hover)] disabled:bg-[var(--ln-brand-indigo)]/50 text-white font-medium py-4 px-8 rounded-2xl transition-all shadow-xl shadow-[var(--ln-brand-indigo)]/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:cursor-not-allowed group"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        Finalizar Configuración del Sistema
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
                <p className="text-center mt-8 text-[12px] text-[var(--ln-text-tertiary)] opacity-60">
                    Propiedad Intelectual MCI © 2026. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
};

const Requirement = ({ label, met }) => (
    <div className={`flex items-center gap-1.5 ${met ? 'text-emerald-500' : 'text-[var(--ln-text-tertiary)] opacity-50'} transition-colors duration-300`}>
        {met ? <Check size={12} weight="bold" /> : <XIcon size={12} weight="bold" />}
        <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </div>
);

export default SetupWizard;
