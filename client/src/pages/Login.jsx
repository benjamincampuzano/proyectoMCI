import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeSlash, ArrowsClockwiseIcon } from '@phosphor-icons/react';
import ChangePasswordModal from '../components/ChangePasswordModal';
import logo from '../assets/logo.jpg';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
    const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, operator: '+' });
    const [captchaAnswer, setCaptchaAnswer] = useState('');
    const { login } = useAuth();
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
        setCaptchaAnswer('');
    };

    useEffect(() => {
        generateCaptcha();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Verify captcha
        const expectedAnswer = captcha.operator === '+'
            ? captcha.num1 + captcha.num2
            : captcha.num1 - captcha.num2;

        if (parseInt(captchaAnswer) !== expectedAnswer) {
            setError('❌ Captcha incorrecto. Por favor resuelve la operación correctamente.');
            generateCaptcha();
            return;
        }

        const result = await login(email, password);
        if (result.success) {
            if (result.mustChangePassword) {
                setShowPasswordChangeModal(true);
            } else {
                navigate('/');
            }
        } else {
            if (result.message?.toLowerCase().includes('contraseña') || result.message?.toLowerCase().includes('password')) {
                setError('❌ Contraseña incorrecta. Verifica tus credenciales e intenta nuevamente.');
            } else {
                setError(`❌ ${result.message}`);
            }
            generateCaptcha();
        }
    };

    const handlePasswordChanged = () => {
        navigate('/');
    };

    return (
        <div className="min-h-[100dvh] bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-950 to-gray-950"></div>
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>

            <div className="relative bg-gray-900/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-gray-800/50 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg border border-gray-700">
                        <img src={logo} alt="MCI Logo" className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-3xl font-semibold tracking-tight text-white">Bienvenido</h2>
                    <p className="text-gray-400 mt-2 text-sm">Ingresa a tu cuenta</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center justify-center gap-2">
                        <span className="text-red-400 font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-950/50 border border-gray-800 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                            placeholder="tu@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Contrasena</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-950/50 border border-gray-800 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all pr-12"
                                placeholder="********"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {showPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
                            </button>
                        </div>
                    </div>

                    {/* Captcha */}
                    <div className="bg-gray-800/50 p-2 rounded-xl border border-gray-700/50">
                        <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Verificación de Seguridad</label>
                        <div className="flex items-center gap-2">
                            <div className="bg-gray-900/50 px-3 py-2 rounded-lg border border-gray-600/50">
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
                                value={captchaAnswer}
                                onChange={(e) => setCaptchaAnswer(e.target.value)}
                                placeholder="Respuesta"
                                className="flex-1 bg-gray-900/50 border border-gray-600/50 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm"
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Resuelve la operación para continuar</p>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-white text-gray-900 font-semibold py-3.5 rounded-xl hover:bg-gray-100 active:scale-[0.98] transition-all shadow-lg shadow-white/5"
                    >
                        Iniciar Sesion
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-400">
                    No tienes cuenta?{' '}
                    <Link to="/register" className="text-white font-medium hover:underline">
                        Registrate aqui
                    </Link>
                </div>

                <div className="mt-4 pt-6 border-t border-gray-800">
                    <button
                        onClick={() => navigate('/public-guest-registration')}
                        className="w-full bg-transparent hover:bg-gray-800/50 text-gray-300 font-medium py-3 rounded-xl border border-gray-700 transition-colors"
                    >
                        Registrar Nuevo Invitado
                    </button>
                </div>
            </div>

            <ChangePasswordModal
                isOpen={showPasswordChangeModal}
                onClose={() => setShowPasswordChangeModal(false)}
                onPasswordChanged={handlePasswordChanged}
            />
        </div>
    );
};

export default Login;
