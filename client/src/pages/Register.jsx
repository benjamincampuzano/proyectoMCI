import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LockIcon, User, DotIcon, Calendar, Check, Shield, X, EyeIcon, EyeClosedIcon, Plus, Envelope, ArrowsClockwiseIcon, Sun, Moon } from '@phosphor-icons/react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { validatePassword, getPasswordStrength } from '../utils/passwordValidator';
import { DATA_POLICY_URL } from '../constants/policies';
import toast from 'react-hot-toast';
import logo from '../assets/logo.jpg';
import AsyncSearchSelect from '../components/ui/AsyncSearchSelect';

const Register = () => {
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
        neighborhood: '',
        city: '',
        maritalStatus: '',
        network: '',
        liderDoceId: '',
        dataPolicyAccepted: false,
        dataTreatmentAuthorized: false,
        minorConsentAuthorized: false,
        captchaAnswer: ''
    });
    const [lideresDoce, setLideresDoce] = useState([]);
    const [selectedLeader, setSelectedLeader] = useState(null);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, operator: '+' });
    const { register } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    // Generate random captcha
    const generateCaptcha = () => {
        const operators = ['+', '-'];
        const operator = operators[Math.floor(Math.random() * operators.length)];
        let num1 = Math.floor(Math.random() * 9) + 1;
        let num2 = Math.floor(Math.random() * 8) + 1;

        // Ensure subtraction doesn't result in negative
        if (operator === '-' && num2 > num1) {
            [num1, num2] = [num2, num1];
        }

        setCaptcha({ num1, num2, operator });
        setFormData({ ...formData, captchaAnswer: '' });
    };

    // Fetch leaders for AsyncSearchSelect
    const fetchLeaders = async (searchTerm) => {
        try {
            const response = await api.get('/auth/leaders', {
                params: { search: searchTerm }
            });
            return response.data;
        } catch (err) {
            console.error('Error fetching leaders:', err);
            throw err;
        }
    };

    // Fetch public leaders (LIDER_DOCE) for the dropdown
    useEffect(() => {
        const fetchLeaders = async () => {
            try {
                const response = await api.get('/auth/leaders');
                setLideresDoce(response.data);
            } catch (err) {
                toast.error('Error al cargar líderes. Por favor intenta nuevamente.');
            }
        };
        fetchLeaders();
        generateCaptcha();
    }, []);

    const calculateAge = (birthDate) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const isMinor = formData.birthDate ? calculateAge(formData.birthDate) < 18 : false;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLeaderSelect = (leader) => {
        setSelectedLeader(leader);
        setFormData({ ...formData, liderDoceId: leader ? leader.id : '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Verify captcha
        const expectedAnswer = captcha.operator === '+'
            ? captcha.num1 + captcha.num2
            : captcha.num1 - captcha.num2;

        if (parseInt(formData.captchaAnswer) !== expectedAnswer) {
            setError('Por favor resuelve correctamente el captcha');
            generateCaptcha();
            return;
        }

        const validation = validatePassword(formData.password, { email: formData.email, fullName: formData.fullName });
        if (!validation.isValid) {
            setError(validation.message);
            return;
        }

        const result = await register(formData);
        if (result.success) {
            toast.success('¡Cuenta creada exitosamente!');
            if (result.mustChangePassword) {
                navigate('/');
            } else {
                navigate('/');
            }
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
                toast.error(errorMessage || 'Error al crear la cuenta. Por favor intenta nuevamente.');
            }

            setError(result.message);
            generateCaptcha();
        }
    };

    return (
        <div className="min-h-[100dvh] bg-[var(--ln-bg-marketing)] flex items-center justify-center p-4 relative transition-colors duration-300">
            {/* Linear-style subtle static elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--ln-brand-indigo)] opacity-[0.03] rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--ln-accent-violet)] opacity-[0.02] rounded-full blur-[120px]"></div>
            </div>
            
            <div className="ln-card p-8 w-full max-w-md md:max-w-4xl max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl backdrop-blur-sm">
                <div className="text-center mb-10">
                    <h1 className="text-4xl mb-2">Crear Cuenta</h1>
                    <p className="text-[var(--ln-text-secondary)] text-lg">Únete a la plataforma de MCI</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-8 text-sm text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="ln-label">Tipo de Documento</label>
                                    <select
                                        name="documentType"
                                        value={formData.documentType}
                                        onChange={handleChange}
                                        className="ln-input"
                                        required
                                    >
                                        <option value="">Seleccione...</option>
                                        <option value="RC">RC</option>
                                        <option value="TI">TI</option>
                                        <option value="CC">CC</option>
                                        <option value="CE">CE</option>
                                        <option value="PP">PPT</option>
                                        <option value="PEP">PEP</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="ln-label">Número Documento</label>
                                    <input
                                        type="text"
                                        name="documentNumber"
                                        value={formData.documentNumber}
                                        onChange={handleChange}
                                        className="ln-input"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="ln-label">Nombre Completo</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="ln-input pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="ln-label">Fecha de Nacimiento</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={formData.birthDate}
                                        onChange={handleChange}
                                        className="ln-input pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="ln-label">Email</label>
                                <div className="relative">
                                   <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="ln-input pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="ln-label">Contraseña</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="ln-input px-10 pr-12"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] transition-colors"
                                    >
                                        {showPassword ? <EyeIcon size={18} /> : <EyeClosedIcon size={18} />}
                                    </button>
                                </div>
                                {formData.password && (
                                    <div className="mt-3 space-y-2">
                                        <div className="flex gap-1.5">
                                            {[...Array(4)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < getPasswordStrength(formData.password)
                                                        ? ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'][getPasswordStrength(formData.password) - 1]
                                                        : 'bg-[var(--ln-border-standard)]'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                            <Requirement label="8+ caracteres" met={formData.password.length >= 8} />
                                            <Requirement label="Mayúscula/Minúscula" met={/[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password)} />
                                            <Requirement label="Número" met={/\d/.test(formData.password)} />
                                            <Requirement label="Símbolo" met={/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            <div>
                                <label className="ln-label">Estado Civil</label>
                                <select
                                    name="maritalStatus"
                                    value={formData.maritalStatus}
                                    onChange={handleChange}
                                    className="ln-input"
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="SOLTERO">Soltero/a</option>
                                    <option value="CASADO">Casado/a</option>
                                    <option value="DIVORCIADO">Divorciado/a</option>
                                    <option value="VIUDO">Viudo/a</option>
                                    <option value="UNION_LIBRE">Unión de hecho/libre</option>
                                    <option value="SEPARADO">Separado/a</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="ln-label">Sexo</label>
                                    <select
                                        name="sex"
                                        value={formData.sex}
                                        onChange={handleChange}
                                        className="ln-input"
                                        required
                                    >
                                        <option value="">Seleccione...</option>
                                        <option value="HOMBRE">Hombre</option>
                                        <option value="MUJER">Mujer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="ln-label">RED</label>
                                    <select
                                        name="network"
                                        value={formData.network}
                                        onChange={handleChange}
                                        className="ln-input"
                                        required
                                    >
                                        <option value="">Seleccione...</option>
                                        <option value="MUJERES">Mujeres</option>
                                        <option value="HOMBRES">Hombres</option>
                                        <option value="KIDS">Kids1 (5 a 7 años)</option>
                                        <option value="ROCAS">Kids2 (8 a 10 años)</option>
                                        <option value="TEENS">Teens (11 a 13 años)</option>
                                        <option value="JOVENES">Jovenes (14 años en adelante solteros)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="ln-label">Dirección</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="ln-input"
                                    required
                                />
                            </div>
                                    
                            <div>
                                <label className="ln-label">Barrio</label>
                                <input
                                    type="text"
                                    name="neighborhood"
                                    value={formData.neighborhood}
                                    onChange={handleChange}
                                    className="ln-input"
                                />
                            </div>
                            </div>
                            <div>
                                <label className="ln-label">Ciudad</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="ln-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="ln-label">Teléfono</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="ln-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="ln-label">Líder de Los Doce</label>
                                <AsyncSearchSelect
                                    fetchItems={fetchLeaders}
                                    onSelect={handleLeaderSelect}
                                    selectedValue={selectedLeader}
                                    placeholder="Buscar líder por nombre..."
                                    labelKey="fullName"
                                    valueKey="id"
                                    className="ln-input !p-0 border-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Captcha */}
                    <div className="bg-[var(--ln-bg-marketing)]/50 p-5 rounded-xl border border-[var(--ln-border-standard)]">
                        <label className="ln-label !mb-3">Verificación de Seguridad</label>
                        <div className="flex items-center gap-4">
                            <div className="bg-[var(--ln-bg-surface)] px-4 py-2.5 rounded-lg border border-[var(--ln-border-standard)] shadow-inner">
                                <span className="text-[var(--ln-text-primary)] font-semibold text-lg tracking-wider">
                                    {captcha.num1} {captcha.operator} {captcha.num2} = ?
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={generateCaptcha}
                                className="p-2.5 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/[0.05] rounded-lg transition-all"
                                title="Generar nuevo captcha"
                            >
                                <ArrowsClockwiseIcon size={20} />
                            </button>
                            <input
                                type="text"
                                name="captchaAnswer"
                                value={formData.captchaAnswer}
                                onChange={handleChange}
                                placeholder="Resuelve..."
                                className="flex-1 ln-input !py-2.5"
                                required
                            />
                        </div>
                        <p className="text-[11px] text-[var(--ln-text-tertiary)] mt-3">Confirma que no eres un robot resolviendo esta operación.</p>
                    </div>

                    {/* Data Authorization Checks */}
                    <div className="bg-[var(--ln-bg-marketing)]/50 p-6 rounded-xl border border-[var(--ln-border-standard)] space-y-4">
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="dataPolicyAccepted"
                                required
                                className="mt-1 w-4.5 h-4.5 rounded border-[var(--ln-border-standard)] text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-brand-indigo)] bg-[var(--ln-bg-surface)] cursor-pointer"
                                checked={formData.dataPolicyAccepted}
                                onChange={e => setFormData({ ...formData, dataPolicyAccepted: e.target.checked })}
                            />
                            <span className="text-sm text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)] transition-colors leading-relaxed">
                                Declaro que he leído y acepto la <a href={DATA_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--ln-accent-violet)] hover:text-[var(--ln-accent-hover)] hover:underline font-semibold">Política de Tratamiento de Datos Personales</a> de MCI.
                            </span>
                        </label>
                        
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="dataTreatmentAuthorized"
                                required
                                className="mt-1 w-4.5 h-4.5 rounded border-[var(--ln-border-standard)] text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-brand-indigo)] bg-[var(--ln-bg-surface)] cursor-pointer"
                                checked={formData.dataTreatmentAuthorized}
                                onChange={e => setFormData({ ...formData, dataTreatmentAuthorized: e.target.checked })}
                            />
                            <span className="text-sm text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)] transition-colors leading-relaxed">
                                Autorizo de manera expresa el tratamiento de mis datos conforme a la <strong>Ley 1581 de 2012</strong>.
                            </span>
                        </label>

                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="minorConsentAuthorized"
                                required={isMinor}
                                className="mt-1 w-4.5 h-4.5 rounded border-[var(--ln-border-standard)] text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-brand-indigo)] bg-[var(--ln-bg-surface)] cursor-pointer"
                                checked={formData.minorConsentAuthorized}
                                onChange={e => setFormData({ ...formData, minorConsentAuthorized: e.target.checked })}
                            />
                            <span className="text-sm text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)] transition-colors leading-relaxed">
                                {isMinor ? (
                                    <span className="text-[var(--ln-accent-violet)] font-semibold">
                                        Cuento con el documento de autorización física/digital firmado por el padre o tutor legal para el tratamiento de datos del menor. (Obligatorio para menores)
                                    </span>
                                ) : (
                                    "En caso de registrar información de menores, declaro contar con autorización del representante legal."
                                )}
                            </span>
                        </label>
                    </div>

                    <div className="pt-4">
                        <button type="submit" className="w-full ln-btn-primary py-4 text-lg">
                            Crear cuenta MCI
                        </button>
                    </div>
                </form>

                <div className="mt-10 pt-6 border-t border-[var(--ln-border-standard)] text-center text-sm text-[var(--ln-text-secondary)]">
                    ¿Ya tienes una cuenta?{' '}
                    <Link to="/login" className="text-[var(--ln-accent-violet)] hover:text-[var(--ln-accent-hover)] font-semibold transition-colors">
                        Inicia sesión aquí
                    </Link>
                </div>
            </div>
        </div>
    );
};

const Requirement = ({ label, met }) => (
    <div className={`flex items-center gap-1.5 transition-colors duration-200 ${met ? 'text-emerald-500' : 'text-[var(--ln-text-tertiary)]'}`}>
        {met ? <Check size={12} weight="bold" /> : <div className="w-3 h-[1px] bg-current opacity-30"></div>}
        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{label}</span>
    </div>
);

export default Register;
