import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Calendar, Check, Shield, X, Eye, EyeSlash, Plus, Envelope, ArrowsClockwiseIcon } from '@phosphor-icons/react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { validatePassword, getPasswordStrength } from '../utils/passwordValidator';
import { DATA_POLICY_URL } from '../constants/policies';
import toast from 'react-hot-toast';
import logo from '../assets/logo.jpg';
import { LockIcon, EyeIcon, EyeClosedIcon } from '@phosphor-icons/react';

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
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, operator: '+' });
    const { register } = useAuth();
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
            navigate('/');
        } else {
            setError(result.message);
            generateCaptcha();
        }
    };

    return (
        <div className="min-h-[100dvh] bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md md:max-w-4xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white">Crear Cuenta</h2>
                    <p className="text-gray-400 mt-2">Únete a la plataforma</p>
                </div>

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
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        required
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
                                        type="text"
                                        name="documentNumber"
                                        value={formData.documentNumber}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="12345678"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="Juan Pérez"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Fecha de Nacimiento</label>
                                <input
                                    type="date"
                                    name="birthDate"
                                    value={formData.birthDate}
                                    onChange={handleChange}
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                                <div className="relative">
                                    <Envelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="tu_email@email.com"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Contraseña</label>
                                <div className="relative">
                                    <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-10 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors pr-12"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                    >
                                        {showPassword ? <EyeClosedIcon size={20} /> : <EyeIcon size={20} />}
                                    </button>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Sexo</label>
                                    <select
                                        name="sex"
                                        value={formData.sex}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        required
                                    >
                                        <option value="HOMBRE">Hombre</option>
                                        <option value="MUJER">Mujer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Teléfono</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="Teléfono"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Dirección</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="Dirección"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Ciudad</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="Manizales"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Estado Civil</label>
                                    <select
                                        name="maritalStatus"
                                        value={formData.maritalStatus}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">RED</label>
                                    <select
                                        name="network"
                                        value={formData.network}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        required
                                    >
                                        <option value="">Seleccione...</option>
                                        <option value="MUJERES">Mujeres</option>
                                        <option value="HOMBRES">Hombres</option>
                                        <option value="KIDS">Kids (5 a 10 años)</option>
                                        <option value="ROCAS">Rocas (11 a 13 años)</option>
                                        <option value="JOVENES">Jovenes (14 años en adelante solteros)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Líder de Los Doce</label>
                                <select
                                    name="liderDoceId"
                                    value={formData.liderDoceId}
                                    onChange={handleChange}
                                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                    required
                                >
                                    <option value="">-- Selecciona tu líder --</option>
                                    {lideresDoce.map(leader => (
                                        <option key={leader.id} value={leader.id}>
                                            {leader.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Captcha */}
                    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                        <label className="block text-sm font-medium text-gray-400 mb-3">Verificación de Seguridad</label>
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-600/50">
                                <span className="text-white font-medium text-sm">
                                    {captcha.num1} {captcha.operator} {captcha.num2} = ?
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={generateCaptcha}
                                className="p-2 text-gray-500 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                                title="Generar nuevo captcha"
                            >
                                <ArrowsClockwiseIcon size={16} />
                            </button>
                            <input
                                type="text"
                                name="captchaAnswer"
                                value={formData.captchaAnswer}
                                onChange={handleChange}
                                placeholder="Respuesta"
                                className="flex-1 bg-gray-800/50 border border-gray-600/50 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm"
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Resuelve la operación para continuar</p>
                    </div>

                    {/* Data Authorization Checks */}
                    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-3 mt-4">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="dataPolicyAccepted"
                                required
                                className="mt-1 w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-800"
                                checked={formData.dataPolicyAccepted}
                                onChange={e => setFormData({ ...formData, dataPolicyAccepted: e.target.checked })}
                            />
                            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                Declaro que he leído y acepto la <a href={DATA_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-semibold">Política de Tratamiento de Datos Personales</a> de MCI.
                            </span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="dataTreatmentAuthorized"
                                required
                                className="mt-1 w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-800"
                                checked={formData.dataTreatmentAuthorized}
                                onChange={e => setFormData({ ...formData, dataTreatmentAuthorized: e.target.checked })}
                            />
                            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                Autorizo de manera expresa el tratamiento de mis datos conforme a la <strong>Ley 1581 de 2012</strong>.
                            </span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="minorConsentAuthorized"
                                required={isMinor}
                                className="mt-1 w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-800"
                                checked={formData.minorConsentAuthorized}
                                onChange={e => setFormData({ ...formData, minorConsentAuthorized: e.target.checked })}
                            />
                            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                {isMinor ? (
                                    <span className="text-blue-500 font-semibold">
                                        Cuento con el documento de autorización física/digital firmado por el padre o tutor legal para el tratamiento de datos del menor. (Obligatorio para menores)
                                    </span>
                                ) : (
                                    "En caso de registrar información de menores, declaro contar con autorización del representante legal."
                                )}
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-lg transition-colors shadow-lg shadow-blue-600/20 mt-6 text-lg"
                    >
                        Registrarse
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-400">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                        Inicia sesión aquí
                    </Link>
                </div>
            </div>
        </div>
    );
};

const Requirement = ({ label, met }) => (
    <div className={`flex items-center gap-1 ${met ? 'text-green-500' : 'text-gray-500'}`}>
        {met ? <Check size={10} /> : <X size={10} />}
        <span>{label}</span>
    </div>
);

export default Register;
