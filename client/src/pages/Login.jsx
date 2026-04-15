import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Lock, Eye, EyeClosedIcon, ArrowsClockwiseIcon, Sun, Moon } from '@phosphor-icons/react';
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

        try {
            const result = await login(email, password);

            if (result.success) {
                if (result.mustChangePassword) {
                    setShowPasswordChangeModal(true);
                } else {
                    navigate('/');
                }
            } else {
                // Handle different types of authentication errors
                if (result.message?.toLowerCase().includes('credenciales') ||
                    result.message?.toLowerCase().includes('incorrectas') ||
                    result.message?.toLowerCase().includes('invalid')) {
                    setError('❌ Correo electrónico o contraseña incorrectos. Por favor verifica tus credenciales.');
                } else if (result.message?.toLowerCase().includes('inactiva') ||
                    result.message?.toLowerCase().includes('deshabilitada')) {
                    setError('❌ Tu cuenta está inactiva. Por favor contacta al administrador.');
                } else if (result.message?.toLowerCase().includes('eliminada') ||
                    result.message?.toLowerCase().includes('eliminado')) {
                    setError('❌ Tu cuenta ha sido eliminada. Por favor contacta al administrador.');
                } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                    setError('❌ No se puede conectar al servidor. Por favor verifica tu conexión a internet.');
                } else {
                    setError(`❌ ${result.message || 'Error al iniciar sesión'}`);
                }
                generateCaptcha();
            }
        } catch (error) {
            console.error('Login error:', error);

            // Handle network errors specifically
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                setError('❌ No se puede conectar al servidor. Por favor verifica tu conexión a internet.');
            } else {
                setError('❌ Error al iniciar sesión. Por favor intenta nuevamente.');
            }
            generateCaptcha();
        }
    };

    const handlePasswordChanged = () => {
        navigate('/');
    };

    return (
        <div className={`min-h-[100dvh] ${theme === 'dark' ? 'bg-black' : 'bg-[#f5f5f7]'} flex items-center justify-center p-4 relative transition-colors duration-300`}>
            {/* Apple-style subtle static elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className={`absolute top-0 left-0 w-96 h-96 ${theme === 'dark' ? 'bg-[#0071e3]' : 'bg-[#0066cc]'} opacity-3 rounded-full blur-3xl`}></div>
                <div className={`absolute bottom-0 right-0 w-80 h-80 ${theme === 'dark' ? 'bg-[#2997ff]' : 'bg-[#0071e3]'} opacity-2 rounded-full blur-3xl`}></div>
            </div>
            
            {/* Floating theme toggle button */}
            <button
                onClick={toggleTheme}
                className={`fixed top-6 right-6 p-3 rounded-full z-50 transition-all duration-300 ${
                    theme === 'dark' 
                        ? 'bg-[#272729] text-white hover:bg-[#2a2a2d]' 
                        : 'bg-white text-[#1d1d1f] hover:bg-[#fafafc] border border-[#e5e5e7]'
                } shadow-lg hover:scale-105 active:scale-95`}
                aria-label="Toggle theme"
            >
                {theme === 'dark' ? (
                    <Sun size={20} weight="regular" />
                ) : (
                    <Moon size={20} weight="regular" />
                )}
            </button>
            <div className="w-full max-w-[440px] relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-xl overflow-hidden">
                        <img src={logo} alt="MCI Logo" className="w-full h-full object-cover" />
                    </div>
                    <h2 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1d1d1f]'}`} style={{ letterSpacing: '-0.02em' }}>Bienvenido</h2>
                    <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Ingresa a tu cuenta</p>
                </div>

                {error && (
                    <div className="bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff453a] p-3 rounded-lg mb-5 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all`}
                            placeholder="tu@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Contrasena</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all pr-10`}
                                placeholder="********"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-[#98989d] hover:text-white' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
                            >
                                {showPassword ? <Eye size={18} weight="regular" /> : <EyeClosedIcon size={18} weight="regular" />}
                            </button>
                        </div>
                    </div>

                    <div className={`${theme === 'dark' ? 'bg-black' : 'bg-white'} p-3 rounded-lg border-none`}>
                        <label className={`block text-xs font-semibold uppercase mb-2 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Verificación de Seguridad</label>
                        <div className="flex items-center gap-2">
                            <div className={`${theme === 'dark' ? 'bg-black' : 'bg-[#fafafc]'} px-3 py-2 rounded-md border-none`}>
                                <span className={`font-normal text-sm ${theme === 'dark' ? 'text-white' : 'text-[#1d1d1f]'}`}>
                                    {captcha.num1} {captcha.operator} {captcha.num2} = ?
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={generateCaptcha}
                                className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'text-[#98989d] hover:text-white hover:bg-[#272729]' : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'}`}
                                title="Generar nuevo captcha"
                            >
                                <ArrowsClockwiseIcon size={14} />
                            </button>
                            <input
                                type="text"
                                value={captchaAnswer}
                                onChange={(e) => setCaptchaAnswer(e.target.value)}
                                placeholder="Respuesta"
                                className={`flex-1 ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none px-2 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-colors text-sm`}
                                required
                            />
                        </div>
                        <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-[#86868b]' : 'text-[#98989d]'}`}>Resuelve la operación para continuar</p>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-[#0071e3] text-white font-normal py-2 rounded-lg hover:bg-[#0077ed] active:scale-[0.98] transition-all"
                    >
                        Iniciar Sesion
                    </button>
                </form>

                <div className={`mt-6 text-center text-sm ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>
                    No tienes cuenta?{' '}
                    <Link to="/register" className={`${theme === 'dark' ? 'text-[#2997ff]' : 'text-[#0066cc]'} font-normal hover:underline`}>
                        Registrate aqui
                    </Link>
                </div>

                <div className={`mt-4 pt-5 ${theme === 'dark' ? 'border-t border-[#3a3a3c]' : 'border-t border-[#e5e5e7]'}`}>
                    <button
                        onClick={() => navigate('/public-guest-registration')}
                        className={`w-full font-normal py-2 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-transparent hover:bg-[#272729] text-white border-[#3a3a3c]' : 'bg-transparent hover:bg-[#f5f5f7] text-[#1d1d1f] border-[#e5e5e7]'}`}
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
