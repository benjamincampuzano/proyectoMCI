import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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

    const generateCaptcha = () => {
        const operators = ['+', '-'];
        const operator = operators[Math.floor(Math.random() * operators.length)];
        let num1 = Math.floor(Math.random() * 9) + 1;
        let num2 = Math.floor(Math.random() * 8) + 1;

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
                if (result.message?.toLowerCase().includes('credenciales') ||
                    result.message?.toLowerCase().includes('incorrectas') ||
                    result.message?.toLowerCase().includes('invalid')) {
                    setError('❌ Correo electrónico o contraseña incorrectos.');
                } else if (result.message?.toLowerCase().includes('inactiva') ||
                    result.message?.toLowerCase().includes('deshabilitada')) {
                    setError('❌ Tu cuenta está inactiva. Contacta al administrador.');
                } else if (result.message?.toLowerCase().includes('eliminada')) {
                    setError('❌ Tu cuenta ha sido eliminada.');
                } else {
                    setError(`❌ ${result.message || 'Error al iniciar sesión'}`);
                }
                generateCaptcha();
            }
        } catch (error) {
            setError('❌ No se puede conectar al servidor.');
            generateCaptcha();
        }
    };

    const handlePasswordChanged = () => {
        navigate('/');
    };

    return (
        <div className="min-h-[100dvh] bg-[var(--ln-bg-marketing)] flex items-center justify-center p-6 relative transition-colors duration-500 overflow-hidden antialiased">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--ln-brand-indigo)] opacity-[0.03] blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--ln-accent-violet)] opacity-[0.03] blur-[120px] rounded-full"></div>
            </div>
            
            <button
                onClick={toggleTheme}
                className="fixed top-8 right-8 p-3 rounded-xl z-50 transition-all duration-300 bg-white/[0.05] border border-[var(--ln-border-standard)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-white/[0.1] shadow-sm backdrop-blur-md group"
                aria-label="Toggle theme"
            >
                <div className="group-hover:rotate-12 transition-transform">
                    {theme === 'dark' ? <Sun size={20} weight="regular" /> : <Moon size={20} weight="regular" />}
                </div>
            </button>

            <div className="w-full max-w-[420px] relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-[20px] overflow-hidden border border-[var(--ln-border-standard)] bg-white/5 shadow-2xl p-0.5">
                        <img src={logo} alt="MCI Logo" className="w-full h-full object-cover rounded-[18px]" />
                    </div>
                    <h1 className="text-3xl weight-590 text-[var(--ln-text-primary)] tracking-[-0.7px] mb-2">Bienvenido</h1>
                    <p className="text-[14px] text-[var(--ln-text-secondary)] font-medium opacity-80">Ingresa a tu cuenta para continuar</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-[13px] font-medium animate-in slide-in-from-top-2 duration-300">
                        {error}
                    </div>
                )}

                <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-sm border border-[var(--ln-border-standard)] rounded-2xl shadow-2xl p-8 transition-all">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">Email</label>
                            <div className="relative group">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/50"
                                    placeholder="tu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">Contraseña</label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all pr-12 placeholder:text-[var(--ln-text-tertiary)]/50"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] transition-colors p-1 rounded-lg"
                                >
                                    {showPassword ? <Eye size={18} /> : <EyeClosedIcon size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] p-4 rounded-xl border border-[var(--ln-border-standard)]">
                            <label className="block text-[10px] weight-590 uppercase tracking-widest mb-3 text-[var(--ln-text-tertiary)]">Verificación de Seguridad</label>
                            <div className="flex items-center gap-3">
                                <div className="bg-[var(--ln-bg-panel)] px-4 py-2.5 rounded-lg border border-[var(--ln-border-standard)]">
                                    <span className="text-[14px] weight-510 text-[var(--ln-text-primary)] whitespace-nowrap">
                                        {captcha.num1} {captcha.operator} {captcha.num2} = ?
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={generateCaptcha}
                                    className="p-2.5 rounded-lg hover:bg-white/[0.05] text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] transition-all border border-transparent hover:border-[var(--ln-border-standard)] active:scale-95"
                                >
                                    <ArrowsClockwiseIcon size={16} />
                                </button>
                                <input
                                    type="text"
                                    value={captchaAnswer}
                                    onChange={(e) => setCaptchaAnswer(e.target.value.slice(0, 3))}
                                    className="w-20 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-3 py-2.5 rounded-lg focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm text-center"
                                    required
                                    maxLength={3}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-[var(--ln-brand-indigo)] text-white font-medium py-3.5 rounded-xl hover:bg-[var(--ln-accent-hover)] active:scale-[0.98] transition-all shadow-lg shadow-[var(--ln-brand-indigo)]/20 text-[14px]"
                        >
                            Iniciar Sesión
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-[var(--ln-border-standard)] text-center">
                        <p className="text-[13px] text-[var(--ln-text-secondary)] mb-4">
                            No tienes cuenta?
                        </p>
                        <button
                            onClick={() => navigate('/register')}
                            className="w-full bg-[var(--ln-brand-indigo)] text-white font-medium py-3.5 rounded-xl hover:bg-[var(--ln-accent-hover)] active:scale-[0.98] transition-all shadow-lg shadow-[var(--ln-brand-indigo)]/20 text-[14px]"
                        >
                            Registrate aquí
                        </button>
                    </div>
                    <div className="mt-8 pt-6 border-t border-[var(--ln-border-standard)] text-center">
                        <p className="text-[13px] text-[var(--ln-text-secondary)] mb-4">
                            Quieres registrar a un Invitado?
                        </p>
                        <button
                            onClick={() => navigate('/public-guest-registration')}
                            className="w-full bg-[var(--ln-brand-indigo)] text-white font-medium py-3.5 rounded-xl hover:bg-[var(--ln-accent-hover)] active:scale-[0.98] transition-all shadow-lg shadow-[var(--ln-brand-indigo)]/20 text-[14px]"
                        >
                            Registrar Nuevo Invitado
                        </button>
                    </div>
                    
                </div>
                <div className="pt-6 text-center">
                    <p className="text-[11px] text-[var(--ln-text-tertiary)] opacity-60">© 2026 MCI. Todos los derechos reservados.</p>
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
