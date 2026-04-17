import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { House, Users, CrossIcon, UserPlus, Heart, PaperPlaneTilt, Calendar, BookOpen, SignOut, TreeStructure, Target, ShieldCheck, Baby, CaretLeft, CaretRight, GuitarIcon } from '@phosphor-icons/react';
import UserMenu from '../components/UserMenu';
import UserProfileModal from '../components/UserProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import logo from '../assets/logo.jpg';
import api from '../utils/api';

const SidebarItem = ({ to, icon: Icon, label, active, isCollapsed }) => (
    <Link
        to={to}
        className={`flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-3 py-2.5'} rounded-lg transition-all duration-200 group ${active
            ? 'bg-[var(--ln-brand-indigo)] text-white shadow-sm'
            : 'text-[var(--ln-text-secondary)] hover:bg-white/[0.04] hover:text-[var(--ln-text-primary)]'
            }`}
        title={isCollapsed ? label : ''}
    >
        <Icon size={22} weight={active ? "fill" : "regular"} className={`${active ? 'text-white' : 'text-[var(--ln-text-tertiary)] group-hover:text-[var(--ln-text-primary)]'} transition-colors`} />
        {!isCollapsed && <span className="text-[14px] weight-510">{label}</span>}
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
                if (isAdmin()) {
                    setHasKidsAccess(true);
                    return;
                }
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
        { to: '/enviar', icon: PaperPlaneTilt, label: 'Enviar' },
        ...(!hasAnyRole(['DISCIPULOS']) ? [{ to: '/kids', icon: Baby, label: 'Kids' }] : []),
        { to: '/escuela-de-artes', icon: GuitarIcon, label: 'Artes' },
        { to: '/encuentros', icon: CrossIcon, label: 'Encuentros' },
        { to: '/convenciones', icon: Calendar, label: 'Convenciones' },
        ...(!hasAnyRole(['DISCIPULOS']) ? [{ to: '/documentos-legales', icon: BookOpen, label: 'Documentos' }] : []),
        ...(hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']) ? [{ to: '/usuarios', icon: Users, label: 'Gestion de Usuarios' }] : []),
        ...(hasAnyRole(['ADMIN']) ? [{ to: '/auditoria', icon: TreeStructure, label: 'Auditoria' } ] : [])
    ];

    return (
        <div className="flex min-h-[100dvh] bg-[var(--ln-bg-marketing)] text-[var(--ln-text-primary)] antialiased transition-colors">
            <aside
                className={`${isCollapsed ? 'w-[72px]' : 'w-64'} bg-[var(--ln-bg-panel)] border-r border-[var(--ln-border-standard)] flex flex-col transition-all duration-300 ease-in-out relative z-[100]`}
            >
                <div className={`${isCollapsed ? 'p-4' : 'px-5 py-5'} border-b border-[var(--ln-border-standard)] flex items-center justify-between overflow-hidden bg-white/[0.02]`}>
                    <div className="flex items-center space-x-3.5 min-w-0">
                        <div className={`relative ${isCollapsed ? 'w-10 h-10' : 'w-11 h-11'} transition-all duration-300 flex-shrink-0`}>
                            <div className="relative w-full h-full rounded-xl overflow-hidden border border-[var(--ln-border-standard)] bg-white/5">
                                <img
                                    src={logo}
                                    alt="MCI Logo"
                                    className="w-full h-full object-cover grayscale-[0.2]"
                                />
                            </div>
                        </div>

                        {!isCollapsed && (
                            <div className="min-w-0">
                                <p className="text-[14px] weight-590 text-[var(--ln-text-primary)] truncate leading-tight">
                                    {user.fullName}
                                </p>
                                <p className="text-[10px] uppercase tracking-widest text-[var(--ln-text-tertiary)] font-bold mt-0.5">
                                    MCI Panel
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3.5 top-[76px] bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] rounded-full p-1.5 shadow-xl hover:shadow-2xl transition-all z-[110] text-[var(--ln-text-tertiary)] hover:text-[var(--ln-accent-violet)] flex items-center justify-center group"
                    title={isCollapsed ? "Expandir" : "Colapsar"}
                >
                    <div className="group-hover:scale-110 transition-transform">
                        {isCollapsed ? <CaretRight size={14} weight="bold" /> : <CaretLeft size={14} weight="bold" />}
                    </div>
                </button>

                <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            active={location.pathname === item.to}
                            isCollapsed={isCollapsed}
                        />
                    ))}
                </nav>

                <div className="p-3 border-t border-[var(--ln-border-standard)] bg-black/[0.02]">
                    <button
                        onClick={logout}
                        className={`flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-3 py-2.5'} w-full rounded-lg text-red-500 hover:bg-red-500/10 transition-all group`}
                        title={isCollapsed ? "Cerrar Sesion" : ""}
                    >
                        <SignOut size={22} weight="regular" className="group-hover:scale-110 transition-transform" />
                        {!isCollapsed && <span className="text-[14px] weight-510">Cerrar Sesion</span>}
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto bg-[var(--ln-bg-marketing)] flex flex-col relative">
                <header className="bg-white/[0.8] dark:bg-[var(--ln-bg-panel)]/80 backdrop-blur-md border-b border-[var(--ln-border-standard)] px-8 h-[73px] flex items-center justify-between sticky top-0 z-[90]">
                    <h2 className="text-[15px] weight-510 text-[var(--ln-text-secondary)] tracking-tight">
                        {navItems.find(item => location.pathname === item.to)?.label || 'Dashboard'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <UserMenu
                            onOpenProfile={() => setShowProfileModal(true)}
                        />
                    </div>
                </header>

                <div className="flex-1 p-8 max-w-[1440px] mx-auto w-full">
                    <Outlet />
                </div>
            </main>

            <UserProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />

            <ChangePasswordModal
                isOpen={user?.mustChangePassword}
                onClose={() => { }}
            />
        </div>
    );
};

export default Layout;
