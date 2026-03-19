import { useState, useEffect } from 'react';
import { Users } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import TabNavigator from '../components/TabNavigator';
import GuestRegistrationForm from '../components/GuestRegistrationForm';
import GuestList from '../components/GuestList';
import GuestStats from '../components/GuestStats';
import OracionDeTresManagement from '../components/OracionDeTresManagement';
import { PageHeader, Button } from '../components/ui';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import CoordinatorSelector from '../components/CoordinatorSelector';
import api from '../utils/api';

const Ganar = () => {
    const { user, hasRole } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showRegistration, setShowRegistration] = useState(false);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);

    // Handler for coordinator changes
    const handleCoordinatorChange = (newCoordinator) => {
        setModuleCoordinator(newCoordinator);
        setRefreshTrigger(prev => prev + 1); // Trigger refresh of components
        
        // After a short delay, refresh the coordinator data from server
        if (newCoordinator) {
            setTimeout(() => {
                fetchCoordinator();
            }, 500);
        } else {
            setTimeout(() => {
                fetchCoordinator();
            }, 500);
        }
    };

    const fetchCoordinator = async () => {
        try {
            const res = await api.get('/coordinators/module/ganar');
            setModuleCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching coordinator:', error);
            // If the endpoint doesn't exist, try to find a coordinator by isCoordinator flag
            try {
                const coordinatorsRes = await api.get('/coordinators', {
                    params: { module: 'ganar' }
                });
                const coordinators = coordinatorsRes.data;
                if (coordinators && coordinators.length > 0) {
                    // Find the first coordinator with LIDER_DOCE role and isCoordinator flag
                    const liderDoceCoordinator = coordinators.find(c => c.role === 'LIDER_DOCE') || coordinators[0];
                    setModuleCoordinator(liderDoceCoordinator);
                } else {
                    setModuleCoordinator(null);
                }
            } catch (fallbackError) {
                console.error('Fallback coordinator fetch failed:', fallbackError);
                setModuleCoordinator(null);
            }
        }
    };

    useEffect(() => {
        fetchCoordinator();
    }, []);

    // Check if user is pastor
    const isPastor = hasRole(ROLES.PASTOR);

    const tabs = [
        { id: 'list', label: 'Lista de Invitados', component: GuestList },
        {
            id: 'stats',
            label: 'Estadísticas',
            component: GuestStats,
            roles: ROLE_GROUPS.ALL_LEADERS
        },
        {
            id: 'oracion',
            label: 'Oración de Tres',
            component: OracionDeTresManagement,
            roles: [ROLES.ADMIN, ROLES.LIDER_DOCE, ROLES.LIDER_CELULA, ROLES.DISCIPULO]
        }
    ];

    const [activeTab, setActiveTab] = useState('list');

    return (
        <div className="space-y-6">
            <PageHeader
                title="Ganar"
                description="Registro y seguimiento de invitados"
                action={
                    <div className="flex items-center gap-4">
                        <CoordinatorSelector 
                            moduleCoordinator={moduleCoordinator}
                            moduleName="Ganar"
                            onCoordinatorChange={handleCoordinatorChange}
                            disabled={!hasRole(ROLES.ADMIN)}
                        />
                        {activeTab === 'list' && (
                            <Button
                                variant={isPastor ? 'outline' : (showRegistration ? 'error' : 'primary')}
                                onClick={() => !isPastor && setShowRegistration(!showRegistration)}
                                disabled={isPastor}
                                className={isPastor ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                                {isPastor ? 'Registro no disponible para Pastores' : (showRegistration ? 'Cancelar Registro' : 'Registrar Nuevo Invitado')}
                            </Button>
                        )}
                    </div>
                }
            />

            <TabNavigator
                tabs={tabs}
                initialTabId="list"
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
