import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Gear, Users, SignOut, ShieldCheck, DevicesIcon } from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import { DATA_POLICY_URL } from '../constants/policies';
import toast from 'react-hot-toast';
import ConfirmationModal from './ConfirmationModal';

const UserMenu = ({ onOpenProfile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showSessions, setShowSessions] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);
    const { user, logout, getSessions, logoutAll, isAdmin: contextIsAdmin } = useAuth();
    const menuRef = useRef(null);

    const isAdmin = contextIsAdmin();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
                setShowSessions(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleMenuItemClick = (action) => {
        setIsOpen(false);
        action();
    };

    const loadSessions = async () => {
        setLoadingSessions(true);
        const data = await getSessions();
        setSessions(data);
        setLoadingSessions(false);
    };

    const handleShowSessions = async () => {
        if (!showSessions) {
            await loadSessions();
            setShowSessions(true);
        } else {
            setShowSessions(false);
        }
    };

    const handleLogoutAll = () => {
        setShowLogoutAllConfirm(true);
    };

    const performLogoutAll = async () => {
        try {
            const result = await logoutAll();
            if (result.success) {
                toast.success('Todas las sesiones han sido cerradas');
                setIsOpen(false);
                setShowLogoutAllConfirm(false);
            } else {
                toast.error(result.message || 'Error al cerrar sesiones');
            }
        } catch (error) {
            toast.error('Error al cerrar sesiones: ' + (error.message || 'Error desconocido'));
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDeviceInfo = (userAgent) => {
        if (!userAgent) return 'Dispositivo desconocido';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Mobile')) return 'Móvil';
        return userAgent.substring(0, 30);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--ln-border-standard)] transition-all group"
            >
                <div className="w-8 h-8 rounded-full bg-[var(--ln-brand-indigo)] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <User size={18} className="text-white" weight="regular" />
                </div>
                <div className="text-left hidden md:block">
                    <p className="text-[13px] weight-510 text-[var(--ln-text-primary)] leading-none">{user?.fullName}</p>
                    <p className="text-[10px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest mt-1 opacity-70">
                        {Array.isArray(user?.roles) ? user.roles[0].replace(/_/g, ' ') : (typeof user?.role === 'string' ? user.role.replace(/_/g, ' ') : 'Usuario')}
                    </p>
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-[var(--ln-bg-surface)]/90 backdrop-blur-xl border border-[var(--ln-border-standard)] rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-[var(--ln-border-standard)] mb-1">
                        <p className="text-[14px] weight-590 text-[var(--ln-text-primary)]">{user?.fullName}</p>
                        <p className="text-[11px] text-[var(--ln-text-tertiary)] mt-0.5">{user?.email}</p>
                    </div>

                    <div className="px-1.5 space-y-0.5">
                        <button
                            onClick={() => handleMenuItemClick(onOpenProfile)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-colors text-left group"
                        >
                            <Gear size={18} className="text-[var(--ln-text-tertiary)] group-hover:text-[var(--ln-text-primary)]" weight="regular" />
                            <span className="text-[13px] text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)]">Configuración de Perfil</span>
                        </button>

                        <a
                            href={DATA_POLICY_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-colors text-left group"
                        >
                            <ShieldCheck size={18} className="text-[var(--ln-text-tertiary)] group-hover:text-[var(--ln-text-primary)]" weight="regular" />
                            <span className="text-[13px] text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)]">Privacidad y Datos</span>
                        </a>

                        <div className="px-4 py-2 flex items-center justify-between border-t border-[var(--ln-border-standard)] mt-2 pt-3">
                            <span className="text-[13px] text-[var(--ln-text-secondary)]">Apariencia</span>
                            <ThemeToggle />
                        </div>

                        <button
                            onClick={handleShowSessions}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-colors text-left group"
                        >
                            <DevicesIcon size={18} className="text-[var(--ln-text-tertiary)] group-hover:text-[var(--ln-text-primary)]" weight="regular" />
                            <span className="text-[13px] text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)]">Mis Sesiones</span>
                        </button>

                        {showSessions && (
                            <div className="px-2 py-2 border border-[var(--ln-border-standard)] bg-black/5 dark:bg-white/5 rounded-lg mx-2 my-1.5 animate-in fade-in zoom-in-95 duration-200">
                                {loadingSessions ? (
                                    <p className="text-[10px] text-[var(--ln-text-tertiary)] text-center py-2 italic font-medium">Cargando...</p>
                                ) : sessions.length === 0 ? (
                                    <p className="text-[10px] text-[var(--ln-text-tertiary)] text-center py-2 font-medium">Sin sesiones activas</p>
                                ) : (
                                    <div className="max-h-32 overflow-y-auto space-y-2">
                                        {sessions.map((session) => (
                                            <div key={session.id} className="text-[10px] py-1 px-2 hover:bg-white/5 rounded transition-colors border-l-2 border-transparent hover:border-[var(--ln-brand-indigo)]">
                                                <p className="font-semibold text-[var(--ln-text-primary)]">{getDeviceInfo(session.userAgent)}</p>
                                                <p className="text-[var(--ln-text-tertiary)] opacity-80 mt-0.5">IP: {session.ipAddress}</p>
                                                <p className="text-[var(--ln-text-tertiary)] opacity-80">Exp: {formatDate(session.expiresAt)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={handleLogoutAll}
                                    className="w-full mt-2 flex items-center justify-center gap-2 px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-md text-red-500 text-[10px] font-bold transition-all uppercase tracking-wider"
                                >
                                    <SignOut size={12} weight="bold" />
                                    <span>Cerrar todo</span>
                                </button>
                            </div>
                        )}

                        <div className="border-t border-[var(--ln-border-standard)] mt-2 pt-1.5">
                            <button
                                onClick={() => handleMenuItemClick(logout)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-left group"
                            >
                                <SignOut size={18} className="text-red-500 group-hover:scale-110 transition-transform" weight="regular" />
                                <span className="text-[13px] text-red-500 font-medium">Cerrar Sesión</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout All Confirmation Modal */}
            <ConfirmationModal
                isOpen={showLogoutAllConfirm}
                onClose={() => setShowLogoutAllConfirm(false)}
                onConfirm={performLogoutAll}
                title="Cerrar Todas las Sesiones"
                message="¿Estás seguro de que quieres cerrar todas las sesiones? Esto te desconectará de todos tus dispositivos."
                confirmText="Cerrar Todas las Sesiones"
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            >
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="text-red-600 dark:text-red-400 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-red-800 dark:text-red-200 font-semibold mb-1">
                                ⚠️ Acción Irreversible
                            </h4>
                            <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                                <li>• Se cerrarán todas las sesiones activas</li>
                                <li>• Deberás iniciar sesión nuevamente</li>
                                <li>• Esto incluye todos tus dispositivos</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </ConfirmationModal>
        </div>
    );
};

export default UserMenu;
