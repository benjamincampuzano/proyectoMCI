import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

    // Function to disable form when system is already initialized
    const isFormDisabled = () => {
        return authLoading || isInitialized;
    };

    useEffect(() => {
        if (isInitialized) {
            navigate('/login');
        }
    }, [isInitialized, navigate]);

    // If system is already initialized, redirect immediately
    if (!authLoading && isInitialized) {
        return <Navigate to="/login" replace />;
    }

    // Show loading while checking initialization status
    if (authLoading) {
        return (
            <div className="min-h-[100dvh] bg-gray-900 flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
            // Handle specific error messages with better user experience
            const errorMessage = result.message.toLowerCase();
            
            if (errorMessage.includes('teléfono') || errorMessage.includes('phone')) {
                toast.error('El número de teléfono ya está registrado. Por favor usa otro número.');
            } else if (errorMessage.includes('correo') || errorMessage.includes('email')) {
                toast.error('El correo electrónico ya está registrado. Por favor usa otro correo.');
            } else if (errorMessage.includes('documento')) {
                toast.error('El número de documento ya está registrado. Por favor verifica tus datos.');
            } else if (errorMessage.includes('nombre') || errorMessage.includes('fullname')) {
                toast.error('El nombre ya está en uso. Por favor usa otro nombre.');
            } else {
                toast.error(errorMessage || 'Error al configurar el sistema. Por favor intenta nuevamente.');
            }
            
            setError(result.message);
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-[100dvh] bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-2xl md:max-w-4xl border border-gray-700">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 text-blue-500 rounded-full mb-4">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Configuración Inicial</h2>
                    <p className="text-gray-400 mt-2">Crea la cuenta del Administrador Principal para comenzar</p>
                </div>

                {isInitialized && (
                    <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-500 p-4 rounded mb-6 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <ShieldCheck size={20} />
                            <span className="font-semibold">Sistema ya configurado</span>
                        </div>
                        <p className="text-sm">El sistema ya tiene usuarios registrados. Por favor, inicia sesión con tu cuenta existente.</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Tipo de Documento</label>
                                    <select
                                        name="documentType"
                                        value={formData.documentType}
                                        onChange={handleChange}
                                        disabled={isFormDisabled()}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="RC">RC</option>
                                        <option value="TI">TI</option>
                                        <option value="CC">CC</option>
                                        <option value="CE">CE</option>
                                        <option value="PP">PP</option>
                                        <option value="PEP">PEP</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Número de Documento</label>
                                    <input
                                        name="documentNumber"
                                        type="text"
                                        value={formData.documentNumber}
                                        onChange={handleChange}
                                        disabled={isFormDisabled()}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="12345678"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        name="fullName"
                                        type="text"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        disabled={isFormDisabled()}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="Ej: Juan Pérez"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Fecha de Nacimiento</label>
                                <input
                                    name="birthDate"
                                    type="date"
                                    value={formData.birthDate}
                                    onChange={handleChange}
                                    disabled={isFormDisabled()}
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Sexo</label>
                                <select
                                    name="sex"
                                    value={formData.sex}
                                    onChange={handleChange}
                                    disabled={isFormDisabled()}
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="HOMBRE">Hombre</option>
                                    <option value="MUJER">Mujer</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Email del Administrador</label>
                                <div className="relative">
                                    <Envelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={isFormDisabled()}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="admin@iglesia.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        name="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={isFormDisabled()}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                {formData.password && (
                                    <div className="mt-2 space-y-2">
                                        <div className="flex gap-1">
                                            {[...Array(4)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1 flex-1 rounded-full transition-colors ${i < getPasswordStrength(formData.password)
                                                        ? ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'][getPasswordStrength(formData.password) - 1]
                                                        : 'bg-gray-700'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                            <Requirement label="8+ caracteres" met={formData.password.length >= 8} />
                                            <Requirement label="Mayúscula/Minúscula" met={/[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password)} />
                                            <Requirement label="Número" met={/\d/.test(formData.password)} />
                                            <Requirement label="Símbolo" met={/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Teléfono</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        name="phone"
                                        type="text"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        disabled={isFormDisabled()}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="+123456789"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Dirección</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                                        <input
                                            name="address"
                                            type="text"
                                            value={formData.address}
                                            onChange={handleChange}
                                            disabled={isFormDisabled()}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="Calle 123..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Ciudad</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                                        <input
                                            name="city"
                                            type="text"
                                            value={formData.city}
                                            onChange={handleChange}
                                            disabled={isFormDisabled()}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="Bogotá"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || isFormDisabled()}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Configurando...' : (
                            <>
                                Finalizar Configuración <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

const Requirement = ({ label, met }) => (
    <div className={`flex items-center gap-1 ${met ? 'text-green-500' : 'text-gray-500'}`}>
        {met ? <Check size={10} /> : <XIcon size={10} />}
        <span>{label}</span>
    </div>
);

export default SetupWizard;
