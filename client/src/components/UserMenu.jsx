import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Gear, Users, SignOut, ShieldCheck, DevicesIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { DATA_POLICY_URL } from '../constants/policies';
import toast from 'react-hot-toast';

const UserMenu = ({ onOpenProfile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showSessions, setShowSessions] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
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

    const handleLogoutAll = async () => {
        if (window.confirm('¿Estás seguro de que quieres cerrar todas las sesiones? Esto te desconectará de todos tus dispositivos.')) {
            const result = await logoutAll();
            if (result.success) {
                toast.success('Todas las sesiones han sido cerradas');
                setIsOpen(false);
            } else {
                toast.error(result.message || 'Error al cerrar sesiones');
            }
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
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
            >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <User size={18} className="text-white" />
                </div>
                <div className="text-left hidden md:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Array.isArray(user?.roles) ? user.roles.join(', ').replace(/_/g, ' ') : (typeof user?.role === 'string' ? user.role.replace(/_/g, ' ') : (Array.isArray(user?.role) ? user.role.join(', ').replace(/_/g, ' ') : 'Usuario'))}
                    </p>
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.fullName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>

                    <button
                        onClick={() => handleMenuItemClick(onOpenProfile)}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                        <Gear size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-200">Mi Perfil</span>
                    </button>

                    <a
                        href={DATA_POLICY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                        <ShieldCheck size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-200">Política de Datos</span>
                    </a>

                    {(user?.roles?.some(r => ['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r))) && (
                        <>
                            <Link
                                to="/usuarios"
                                onClick={() => setIsOpen(false)}
                                className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                                <Users size={18} className="text-gray-500 dark:text-gray-400" />
                                <span className="text-sm text-gray-700 dark:text-gray-200">Administrador de Usuarios</span>
                            </Link>
                        </>
                    )}

                    <div className="px-4 py-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-200">Tema</span>
                            <ThemeToggle />
                        </div>
                    </div>

                    <button
                        onClick={handleShowSessions}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                        <DevicesIcon size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-200">Mis Sesiones</span>
                    </button>

                    {showSessions && (
                        <div className="px-2 py-2 border-t border-b border-gray-200 dark:border-gray-700 mx-2 my-1">
                            {loadingSessions ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">Cargando...</p>
                            ) : sessions.length === 0 ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">No hay sesiones activas</p>
                            ) : (
                                <div className="max-h-40 overflow-y-auto">
                                    {sessions.map((session) => (
                                        <div key={session.id} className="text-xs py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                            <p className="font-medium text-gray-700 dark:text-gray-200">{getDeviceInfo(session.userAgent)}</p>
                                            <p className="text-gray-500 dark:text-gray-400">IP: {session.ipAddress || 'Desconocida'}</p>
                                            <p className="text-gray-500 dark:text-gray-400">Expira: {formatDate(session.expiresAt)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={handleLogoutAll}
                                className="w-full mt-2 flex items-center justify-center space-x-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded text-red-600 dark:text-red-400 text-xs transition-colors"
                            >
                                <SignOut size={14} />
                                <span>Cerrar todas las sesiones</span>
                            </button>
                        </div>
                    )}

                    <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                        <button
                            onClick={() => handleMenuItemClick(logout)}
                            className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                        >
                            <SignOut size={18} className="text-red-500 dark:text-red-400" />
                            <span className="text-sm text-red-600 dark:text-red-400">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
