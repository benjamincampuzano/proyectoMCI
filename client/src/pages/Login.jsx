import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { Eye, EyeClosedIcon, ArrowsClockwiseIcon, Sun, Moon, UserPlus, Users, CalendarDots, Cross } from '@phosphor-icons/react';
import ChangePasswordModal from '../components/ChangePasswordModal';
import api, { resolveMediaUrl } from '../utils/api';
import logo from '../assets/logo.jpg';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
    const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, operator: '+' });
    const [captchaAnswer, setCaptchaAnswer] = useState('');
    const [setting, setSetting] = useState({
        mediaType: 'IMAGE',
        mediaUrl: '',
        welcomeTitle: 'Bienvenido a Somos MCI Manizales',
        welcomeSubtitle: 'Ingresa a tu cuenta para continuar'
    });
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
        void Promise.resolve().then(generateCaptcha);
        api.get('/login-setting')
            .then((res) => {
                if (res.data?.mediaUrl) {
                    setSetting({
                        mediaType: res.data.mediaType || 'IMAGE',
                        mediaUrl: res.data.mediaUrl,
                        welcomeTitle: res.data.welcomeTitle || 'Bienvenido a Somos MCI Manizales',
                        welcomeSubtitle: res.data.welcomeSubtitle || 'Ingresa a tu cuenta para continuar'
                    });
                }
            })
            .catch(() => {});
    }, []);

    const mediaSrc = resolveMediaUrl(setting.mediaUrl);
    const isVideo = setting.mediaType === 'VIDEO' && mediaSrc;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validación de seguridad para prevenir inyección SQL (fugas de información)
        const sqlInjectionRegex = /['";\\]|(--)|(\/\*)|(\*\/)/;
        if (sqlInjectionRegex.test(email) || sqlInjectionRegex.test(password)) {
            setError('❌ Error de seguridad: Se han detectado caracteres no permitidos.');
            generateCaptcha();
            return;
        }

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
        } catch {
            setError('❌ No se puede conectar al servidor.');
            generateCaptcha();
        }
    };

    const handlePasswordChanged = () => {
        navigate('/');
    };

    return (
        <div className="min-h-[100dvh] bg-[var(--ln-bg-marketing)] flex flex-col lg:flex-row transition-colors duration-500 overflow-hidden antialiased relative">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden lg:hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--ln-brand-indigo)] opacity-[0.03] blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--ln-accent-violet)] opacity-[0.03] blur-[120px] rounded-full"></div>
            </div>

            <button
                onClick={toggleTheme}
                className="fixed top-4 sm:top-8 right-4 sm:right-8 p-2.5 sm:p-3 rounded-xl z-50 transition-all duration-300 bg-white/[0.05] border border-[var(--ln-border-standard)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-white/[0.1] shadow-sm backdrop-blur-md group"
                aria-label="Toggle theme"
            >
                <div className="group-hover:rotate-12 transition-transform">
                    {theme === 'dark' ? <Sun size={20} weight="regular" /> : <Moon size={20} weight="regular" />}
                </div>
            </button>

            {/* ===== PANEL IZQUIERDO: IMAGEN / VIDEO DE BIENVENIDA ===== */}
            <aside className="hidden lg:flex lg:w-[54%] xl:w-[56%] shrink-0 h-[100dvh] relative overflow-hidden">
                {isVideo ? (
                    <video
                        key={mediaSrc}
                        src={mediaSrc}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : mediaSrc ? (
                    <>
                        <img
                            src={mediaSrc}
                            alt="Bienvenida Somos MCI Manizales"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-white/[0.04] mix-blend-overlay" />
                    </>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0b0c10] via-[#17181f] to-[#241a33] flex flex-col items-center justify-center">
                        <div className="w-24 h-24 rounded-[24px] overflow-hidden border border-white/10 bg-white/5 p-0.5 shadow-2xl mb-8">
                            <img src={logo} alt="Somos Logo" className="w-full h-full object-cover rounded-[22px]" />
                        </div>
                    </div>
                )}

                {/* Overlays para legibilidad */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

                {/* Marca */}
                <div className="absolute top-8 left-8 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/15 bg-white/10 p-0.5">
                        <img src={logo} alt="Somos" className="w-full h-full object-cover rounded-[9px]" />
                    </div>
                    <div className="text-white">
                        <p className="text-[15px] weight-590 tracking-[-0.3px]">Somos MCI Manizales</p>
                        <p className="text-[11px] text-white/60 font-medium">Red Ministerial</p>
                    </div>
                </div>

                {/* Texto de bienvenida */}
                <div className="absolute bottom-10 left-10 right-10 max-w-xl">
                    <h2 className="text-3xl xl:text-[40px] leading-tight weight-590 text-white tracking-[-0.8px] mb-3">
                        {setting.welcomeTitle}
                    </h2>
                    <p className="text-[14px] xl:text-[15px] text-white/80 font-medium leading-relaxed">
                        {setting.welcomeSubtitle}
                    </p>
                </div>
            </aside>

            {/* ===== FRANJA DERECHA: FORMULARIO DE ACCESO ===== */}
            <main className="flex-1 h-[100dvh] overflow-y-auto relative z-10">
                <div className="flex min-h-full items-center justify-center px-4 sm:px-8 py-8">
                    <div className="w-full max-w-[540px] animate-in fade-in zoom-in-95 duration-500">
                        <div className="text-center mb-6">
                            <div className="w-12 sm:w-14 h-12 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-[18px] overflow-hidden border border-[var(--ln-border-standard)] bg-white/5 shadow-2xl p-0.5">
                                <img src={logo} alt="Somos Logo" className="w-full h-full object-cover rounded-[16px]" />
                            </div>
                            <h1 className="text-xl sm:text-2xl weight-590 text-[var(--ln-text-primary)] tracking-[-0.7px] mb-2">Bienvenido</h1>
                            <p className="text-[12px] sm:text-[13px] text-[var(--ln-text-secondary)] font-medium opacity-80">Ingresa a tu cuenta para continuar</p>
                        </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 sm:p-4 rounded-xl mb-4 text-[12px] sm:text-[13px] font-medium animate-in slide-in-from-top-2 duration-300">
                            {error}
                        </div>
                    )}

                    <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-sm border border-[var(--ln-border-standard)] rounded-2xl shadow-2xl p-5 sm:p-7 transition-all">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">Email</label>
                                <div className="relative group">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/50 text-sm"
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
                                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all pr-12 placeholder:text-[var(--ln-text-tertiary)]/50 text-sm"
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
                                <label className="block text-[10px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)]">Verificación de Seguridad</label>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                                    <div className="bg-[var(--ln-bg-panel)] px-4 py-2.5 rounded-lg border border-[var(--ln-border-standard)] flex-1 sm:flex-none">
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
                                        className="w-full sm:w-20 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-3 py-2.5 rounded-lg focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm text-center"
                                        required
                                        maxLength={3}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-[var(--ln-brand-indigo)] text-white font-medium py-3 sm:py-3.5 rounded-xl hover:bg-[var(--ln-accent-hover)] active:scale-[0.98] transition-all shadow-lg shadow-[var(--ln-brand-indigo)]/20 text-[13px] sm:text-[14px]"
                            >
                                Iniciar Sesión
                            </button>
                        </form>

                        {/* Registration Options Section */}
                        <div className="mt-6 pt-5 border-t border-[var(--ln-border-standard)]">
                            <div className="mb-3">
                                <p className="text-[12px] sm:text-[13px] text-[var(--ln-text-secondary)] mb-2 text-center">
                                    ¿No tienes cuenta?
                                </p>
                                <button
                                    onClick={() => navigate('/register')}
                                    className="w-full bg-[var(--ln-brand-indigo)] text-white font-medium py-2.5 sm:py-3 rounded-xl hover:bg-[var(--ln-accent-hover)] active:scale-[0.98] transition-all shadow-lg shadow-[var(--ln-brand-indigo)]/20 text-[12px] sm:text-[13px] flex items-center justify-center gap-2"
                                >
                                    <UserPlus size={18} weight="regular" />
                                    Crear Cuenta
                                </button>
                            </div>

                            <div className="mt-5 pt-5 border-t border-[var(--ln-border-standard)]">
                                <p className="text-[11px] sm:text-[12px] text-[var(--ln-text-tertiary)] uppercase tracking-widest mb-4 text-center opacity-70">Otros tipos de registro</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 gap-y-2">
                                    <button
                                        onClick={() => navigate('/registro-invitados')}
                                        className="group bg-gradient-to-br from-[#7170ff]/10 to-transparent border border-[#7170ff]/30 hover:border-[#7170ff]/60 text-[var(--ln-text-primary)] font-medium py-2.5 sm:py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-[#7170ff]/10 text-[11px] sm:text-[12px] flex items-center justify-center gap-2"
                                    >
                                        <Users size={17} weight="regular" className="group-hover:scale-110 transition-transform" />
                                        <span>Registrar Invitado</span>
                                    </button>

                                    <button
                                        onClick={() => navigate('/registro-convenciones')}
                                        className="group bg-gradient-to-br from-[#5e6ad2]/10 to-transparent border border-[#5e6ad2]/30 hover:border-[#5e6ad2]/60 text-[var(--ln-text-primary)] font-medium py-2.5 sm:py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-[#5e6ad2]/10 text-[11px] sm:text-[12px] flex items-center justify-center gap-2"
                                    >
                                        <CalendarDots size={17} weight="regular" className="group-hover:scale-110 transition-transform" />
                                        <span>Registrar Convención</span>
                                    </button>

                                    <button
                                        onClick={() => navigate('/registro-encuentros')}
                                        className="group bg-gradient-to-br from-[#22c55e]/10 to-transparent border border-[#22c55e]/30 hover:border-[#22c55e]/60 text-[var(--ln-text-primary)] font-medium py-2.5 sm:py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-[#22c55e]/10 text-[11px] sm:text-[12px] flex items-center justify-center gap-2"
                                    >
                                        <Cross size={17} weight="regular" className="group-hover:scale-110 transition-transform" />
                                        <span>Registrar Encuentro</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 text-center">
                        <p className="text-[10px] sm:text-[11px] text-[var(--ln-text-tertiary)] opacity-60">© 2026 Somos. Todos los derechos reservados.</p>
                    </div>
                    </div>
                </div>
            </main>

            <ChangePasswordModal
                isOpen={showPasswordChangeModal}
                onClose={() => setShowPasswordChangeModal(false)}
                onPasswordChanged={handlePasswordChanged}
            />
        </div>
    );
};

export default Login;