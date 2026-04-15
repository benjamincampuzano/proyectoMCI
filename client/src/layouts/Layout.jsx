import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { House, Users, UserPlus, Heart, PaperPlaneTilt, Calendar, BookOpen, SignOut, TreeStructure, Target, ShieldCheck, Baby, CaretLeft, CaretRight, GuitarIcon } from '@phosphor-icons/react';
import UserMenu from '../components/UserMenu';
import UserProfileModal from '../components/UserProfileModal';
import PasswordChangeModal from '../components/auth/PasswordChangeModal';
import logo from '../assets/logo.jpg';
import api from '../utils/api';

const SidebarItem = ({ to, icon: Icon, label, active }) => (
    <Link
        to={to}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active
            ? 'bg-[#0071e3] text-white'
            : 'text-[#1d1d1f] dark:text-white/80 hover:bg-[#f5f5f7] dark:hover:bg-[#272729] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
    >
        <Icon size={20} weight="regular" />
        <span className="font-normal">{label}</span>
    </Link>
);

const Layout = () => {
    const { user, logout, hasAnyRole, isAdmin } = useAuth();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [hasKidsAccess, setHasKidsAccess] = useState(false);

    // Check if user has access to KIDS module
    useEffect(() => {
        const checkKidsAccess = async () => {
            try {
                // If user is ADMIN, always grant access
                if (isAdmin()) {
                    setHasKidsAccess(true);
                    return;
                }
                
                // For non-admin users, check access via API
                const res = await api.get('/kids/students/check-access');
                setHasKidsAccess(res.data.hasAccess);
            } catch (error) {
                console.error('Error checking KIDS access:', error);
                setHasKidsAccess(false);
            }
        };

        if (user) {
            checkKidsAccess();
        }
    }, [user, isAdmin]);

    if (!user) return <Outlet />;

    const navItems = [
        { to: '/', icon: House, label: 'Home' },
        ...(hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']) ? [{ to: '/metas', icon: Target, label: 'Metas' }] : []),
        { to: '/ganar', icon: UserPlus, label: 'Ganar' },
        { to: '/consolidar', icon: Heart, label: 'Consolidar' },
        { to: '/discipular', icon: BookOpen, label: 'Discipular' },
        ...(hasKidsAccess ? [{ to: '/kids', icon: Baby, label: 'Kids' }] : []),
        { to: '/escuela-de-artes', icon: GuitarIcon, label: 'Artes' },
        { to: '/enviar', icon: PaperPlaneTilt, label: 'Enviar' },
        { to: '/encuentros', icon: Users, label: 'Encuentros' },
        { to: '/convenciones', icon: Calendar, label: 'Convenciones' },
        { to: '/documentos-legales', icon: BookOpen, label: 'Documentos' },
        ...(isAdmin()
            ? [
                { to: '/auditoria', icon: TreeStructure, label: 'Auditoria' }
            ]
            : [])
    ];

    return (
        <div className="flex min-h-[100dvh] bg-[#f5f5f7] dark:bg-black text-[#1d1d1f] dark:text-white">
            <aside
                className={`${isCollapsed ? 'w-16' : 'w-60'} bg-white dark:bg-[#1d1d1f] border-r border-[#d1d1d6] dark:border-[#3a3a3c] flex flex-col transition-all duration-300 ease-in-out relative`}
            >
                <div className={`${isCollapsed ? 'p-3' : 'p-4'} border-b border-[#d1d1d6] dark:border-[#3a3a3c] flex items-center justify-between overflow-hidden`}>
                    <div className="flex items-center space-x-3 min-w-0">
                        <div className={`relative ${isCollapsed ? 'w-8 h-8' : 'w-10 h-10'} transition-all duration-300`}>
                            <div className="relative w-full h-full rounded-lg overflow-hidden">
                                <img
                                    src={logo}
                                    alt="MCI Logo"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        {!isCollapsed && (
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white truncate">
                                    {user.fullName}
                                </p>
                                <p className="text-[10px] uppercase tracking-wider text-[#86868b] dark:text-[#98989d] font-medium truncate">
                                    Panel
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-[68px] bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-full p-1.5 shadow-sm hover:shadow-md transition-all z-50 text-[#86868b] hover:text-[#0071e3] flex items-center justify-center"
                    title={isCollapsed ? "Expandir" : "Colapsar"}
                >
                    {isCollapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
                </button>

                <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const isExternal = item.external;
                        const isActive = !isExternal && location.pathname === item.to;
                        const content = (
                            <>
                                <item.icon size={22} weight="regular" />
                                {!isCollapsed && <span className="font-normal">{item.label}</span>}
                            </>
                        );
                        const className = `flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-3 py-2.5'} rounded-lg transition-colors ${isActive
                            ? 'bg-[#0071e3] text-white'
                            : 'text-[#1d1d1f] dark:text-white/80 hover:bg-[#f5f5f7] dark:hover:bg-[#272729] hover:text-[#1d1d1f] dark:hover:text-white'
                            }`;

                        if (isExternal) {
                            return (
                                <a
                                    key={item.label}
                                    href={item.to}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={className}
                                    title={isCollapsed ? item.label : ''}
                                >
                                    {content}
                                </a>
                            );
                        }

                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={className}
                                title={isCollapsed ? item.label : ''}
                            >
                                {content}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-2 border-t border-[#d1d1d6] dark:border-[#3a3a3c]">
                    <button
                        onClick={logout}
                        className={`flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-3 py-2.5'} w-full rounded-lg text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors`}
                        title={isCollapsed ? "Cerrar Sesion" : ""}
                    >
                        <SignOut size={22} weight="regular" />
                        {!isCollapsed && <span className="font-normal">Cerrar Sesion</span>}
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-black flex flex-col">
                <header className="bg-white dark:bg-[#1d1d1f] border-b border-[#d1d1d6] dark:border-[#3a3a3c] px-6 py-3 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">Dashboard</h2>
                    <UserMenu
                        onOpenProfile={() => setShowProfileModal(true)}
                    />
                </header>

                <div className="flex-1 p-6">
                    <Outlet />
                </div>
            </main>

            <UserProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />

            <PasswordChangeModal
                isOpen={user?.mustChangePassword}
                onClose={() => { }}
            />
        </div>
    );
};

export default Layout;
