import { useState, useEffect } from 'react';
import { Users, ArrowsClockwise } from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuth';
import TabNavigator from '../components/TabNavigator';
import GuestRegistrationForm from '../components/GuestRegistrationForm';
import GuestList from '../components/GuestList';
import GuestTracking from '../components/GuestTracking';
import GuestStats from '../components/GuestStats';
import OracionDeTresManagement from '../components/OracionDeTresManagement';
import ServerManager from '../components/ServerManager';
import { PageHeader, Button } from '../components/ui';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import CoordinatorDisplay from '../components/CoordinatorDisplay';
import api from '../utils/api';

const Ganar = () => {
    const { user, hasRole, hasAnyRole, isCoordinator, isSubCoordinator, isTreasurer } = useAuth();

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showRegistration, setShowRegistration] = useState(false);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);
    const [moduleSubCoordinator, setModuleSubCoordinator] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const fetchCoordinator = async () => {
            try {
                const res = await api.get('/coordinators/module/ganar');
                if (!cancelled) setModuleCoordinator(res.data);
            } catch (error) {
                if (!cancelled) {
                    console.error('Error fetching coordinator:', error);
                    try {
                        const coordinatorsRes = await api.get('/coordinators', {
                            params: { module: 'ganar' }
                        });
                        const coordinators = coordinatorsRes.data;
                        if (coordinators && coordinators.length > 0) {
                            const liderDoceCoordinator = coordinators.find(c => c.role === 'LIDER_DOCE') || coordinators[0];
                            if (!cancelled) setModuleCoordinator(liderDoceCoordinator);
                        } else {
                            if (!cancelled) setModuleCoordinator(null);
                        }
                    } catch (fallbackError) {
                        if (!cancelled) {
                            console.error('Fallback coordinator fetch failed:', fallbackError);
                            setModuleCoordinator(null);
                        }
                    }
                }
            }
        };

        const fetchSubCoordinator = async () => {
            try {
                const res = await api.get('/coordinators/module/ganar/subcoordinator');
                if (!cancelled) setModuleSubCoordinator(res.data);
            } catch (error) {
                if (!cancelled) {
                    console.error('Error fetching subcoordinator:', error);
                    setModuleSubCoordinator(null);
                }
            }
        };

        fetchCoordinator();
        fetchSubCoordinator();

        return () => {
            cancelled = true;
        };
    }, []);

    // Check if user is pastor
    const isPastor = hasRole(ROLES.PASTOR);

    const tabs = [
        { id: 'list', label: 'Lista de Invitados', component: GuestList },
        { id: 'tracking', label: 'Seguimiento de Invitados', component: GuestTracking },
        {
            id: 'stats',
            label: 'Estadísticas',
            component: GuestStats,
            customCheck: () => {
                const hasRoleAccess = hasAnyRole(ROLE_GROUPS.ALL_LEADERS);
                const isModuleCoord = isCoordinator('ganar');
                const isModuleSubCoord = isSubCoordinator('ganar');
                const isModuleTreasurer = isTreasurer('ganar');
                return hasRoleAccess || isModuleCoord || isModuleSubCoord || isModuleTreasurer;
            }
        },
        {
            id: 'oracion',
            label: 'Oración de Tres',
            component: OracionDeTresManagement,
            customCheck: () => {
                const hasRoleAccess = hasAnyRole([ROLES.ADMIN, ROLES.LIDER_DOCE, ROLES.LIDER_CELULA, ROLES.DISCIPULO]);
                const isModuleCoord = isCoordinator('ganar');
                const isModuleSubCoord = isSubCoordinator('ganar');
                return hasRoleAccess || isModuleCoord || isModuleSubCoord;
            }
        },
        {
            id: 'servidores',
            label: 'Servidores',
            component: ServerManager,
            customCheck: () => {
                // Solo ADMIN, PASTOR y el coordinador del módulo Ganar tienen acceso
                const hasRoleAccess = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR]);
                const isModuleCoord = !!(moduleCoordinator?.id && user?.id && String(moduleCoordinator.id) === String(user.id));
                return hasRoleAccess || isModuleCoord;
            }
        }
    ];

    const [activeTab, setActiveTab] = useState('list');

    return (
        <div className="space-y-6">
            <PageHeader
                title="Ganar"
                description="Registro y seguimiento de invitados"
                action={
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <CoordinatorDisplay
                            coordinator={moduleCoordinator}
                            subCoordinator={moduleSubCoordinator}
                            moduleName="Ganar"
                        />
                        {activeTab === 'list' && (
                            <Button
                                variant={isPastor ? 'outline' : (showRegistration ? 'error' : 'primary')}
                                onClick={() => !isPastor && setShowRegistration(!showRegistration)}
                                disabled={isPastor}
                                className={`${isPastor ? 'opacity-50 cursor-not-allowed' : ''} w-full sm:w-auto text-sm sm:text-base`}
                                size="sm"
                            >
                                {isPastor ? 'Registro no disponible para Pastores' : (showRegistration ? 'Cancelar' : '+ Nuevo Invitado')}
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Floating Refresh Button */}
            <div className="fixed bottom-8 right-8 z-40">
                <button
                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                    className="flex items-center gap-2.5 px-4 py-2.5 bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-accent-hover)] text-white rounded-xl weight-510 text-[13px] transition-all shadow-lg shadow-[var(--ln-brand-indigo)]/20 active:scale-95"
                >
                    <ArrowsClockwise className="w-4 h-4" weight="bold" />
                    Actualizar
                </button>
            </div>

            <TabNavigator moduleName="ganar"
                tabs={tabs}
                initialTabId="list"
                refreshTrigger={refreshTrigger}
                onTabChange={(tabId) => {
                    setActiveTab(tabId);
                    if (tabId !== 'list') {
                        setShowRegistration(false);
                    }
                }}
            />

            {/* Guest Registration Modal */}
            <GuestRegistrationForm
                isOpen={showRegistration}
                onClose={() => setShowRegistration(false)}
                onGuestCreated={() => {
                    setShowRegistration(false);
                    setRefreshTrigger(prev => prev + 1);
                }}
            />
        </div>
    );
};

export default Ganar;
