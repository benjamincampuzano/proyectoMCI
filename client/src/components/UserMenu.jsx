import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Gear, Users, SignOut, ShieldCheck, DevicesIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
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
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-[#272729] hover:bg-[#e5e5ea] dark:hover:bg-[#3a3a3c] transition-colors"
            >
                <div className="w-7 h-7 rounded-full bg-[#0071e3] flex items-center justify-center">
                    <User size={16} className="text-white" weight="regular" />
                </div>
                <div className="text-left hidden md:block">
                    <p className="text-sm font-normal text-[#1d1d1f] dark:text-white">{user?.fullName}</p>
                    <p className="text-[10px] text-[#86868b] dark:text-[#98989d]">
                        {Array.isArray(user?.roles) ? user.roles.join(', ').replace(/_/g, ' ') : (typeof user?.role === 'string' ? user.role.replace(/_/g, ' ') : (Array.isArray(user?.role) ? user.role.join(', ').replace(/_/g, ' ') : 'Usuario'))}
                    </p>
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px] py-1 z-50">
                    <div className="px-3 py-2 border-b border-[#d1d1d6] dark:border-[#3a3a3c]">
                        <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white">{user?.fullName}</p>
                        <p className="text-[10px] text-[#86868b] dark:text-[#98989d]">{user?.email}</p>
                    </div>

                    <button
                        onClick={() => handleMenuItemClick(onOpenProfile)}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-[#f5f5f7] dark:hover:bg-[#272729] transition-colors text-left"
                    >
                        <Gear size={16} className="text-[#86868b]" weight="regular" />
                        <span className="text-sm text-[#1d1d1f] dark:text-white">Mi Perfil</span>
                    </button>

                    <a
                        href={DATA_POLICY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-[#f5f5f7] dark:hover:bg-[#272729] transition-colors text-left"
                    >
                        <ShieldCheck size={16} className="text-[#86868b]" weight="regular" />
                        <span className="text-sm text-[#1d1d1f] dark:text-white">Política de Datos</span>
                    </a>

                    {(user?.roles?.some(r => ['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r))) && (
                        <>
                            <Link
                                to="/usuarios"
                                onClick={() => setIsOpen(false)}
                                className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-[#f5f5f7] dark:hover:bg-[#272729] transition-colors text-left"
                            >
                                <Users size={16} className="text-[#86868b]" weight="regular" />
                                <span className="text-sm text-[#1d1d1f] dark:text-white">Administrador</span>
                            </Link>
                        </>
                    )}

                    <div className="px-3 py-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-[#1d1d1f] dark:text-white">Tema</span>
                            <ThemeToggle />
                        </div>
                    </div>

                    <button
                        onClick={handleShowSessions}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-[#f5f5f7] dark:hover:bg-[#272729] transition-colors text-left"
                    >
                        <DevicesIcon size={16} className="text-[#86868b]" weight="regular" />
                        <span className="text-sm text-[#1d1d1f] dark:text-white">Mis Sesiones</span>
                    </button>

                    {showSessions && (
                        <div className="px-2 py-2 border-t border-b border-[#d1d1d6] dark:border-[#3a3a3c] mx-2 my-1">
                            {loadingSessions ? (
                                <p className="text-[10px] text-[#86868b] text-center py-2">Cargando...</p>
                            ) : sessions.length === 0 ? (
                                <p className="text-[10px] text-[#86868b] text-center py-2">No hay sesiones activas</p>
                            ) : (
                                <div className="max-h-32 overflow-y-auto">
                                    {sessions.map((session) => (
                                        <div key={session.id} className="text-[10px] py-1 px-2 hover:bg-[#f5f5f7] dark:hover:bg-[#272729] rounded">
                                            <p className="font-medium text-[#1d1d1f] dark:text-white">{getDeviceInfo(session.userAgent)}</p>
                                            <p className="text-[#86868b]">IP: {session.ipAddress || 'Desconocida'}</p>
                                            <p className="text-[#86868b]">Expira: {formatDate(session.expiresAt)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={handleLogoutAll}
                                className="w-full mt-2 flex items-center justify-center space-x-1.5 px-2 py-1.5 bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 rounded text-[#ff3b30] text-[10px] transition-colors"
                            >
                                <SignOut size={12} />
                                <span>Cerrar todas las sesiones</span>
                            </button>
                        </div>
                    )}

                    <div className="border-t border-[#d1d1d6] dark:border-[#3a3a3c] mt-1 pt-1">
                        <button
                            onClick={() => handleMenuItemClick(logout)}
                            className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-[#ff3b30]/10 transition-colors text-left"
                        >
                            <SignOut size={16} className="text-[#ff3b30]" weight="regular" />
                            <span className="text-sm text-[#ff3b30]">Cerrar Sesión</span>
                        </button>
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
