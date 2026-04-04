import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import CourseManagement from '../components/School/CourseManagement';
import SchoolLeaderStats from '../components/School/SchoolLeaderStats';
import StudentMatrix from '../components/School/StudentMatrix';
import { PageHeader, Button } from '../components/ui';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import CoordinatorSelector from '../components/CoordinatorSelector';
import TreasurerSelector from '../components/TreasurerSelector';
import SubCoordinatorSelector from '../components/SubCoordinatorSelector';
import { ArrowsClockwise } from '@phosphor-icons/react';
import api from '../utils/api';

const Discipular = () => {
    const { user, hasAnyRole, isCoordinator } = useAuth();
    const hasAdminOrPastor = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR]);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);
    const [moduleSubCoordinator, setModuleSubCoordinator] = useState(null);
    const [moduleTreasurer, setModuleTreasurer] = useState(null);

    const handleRefresh = () => {
        fetchCoordinator();
        fetchSubCoordinator();
        fetchTreasurer();
    };

    // Handler for coordinator changes
    const handleCoordinatorChange = (newCoordinator) => {
        setModuleCoordinator(newCoordinator);
        
        // After a short delay, refresh the coordinator data from server
        setTimeout(() => {
            fetchCoordinator();
        }, 500);
    };

    // Handler for treasurer changes
    const handleTreasurerChange = (newTreasurer) => {
        setModuleTreasurer(newTreasurer);
        
        setTimeout(() => {
            fetchTreasurer();
        }, 500);
    };

    // Handler for sub-coordinator changes
    const handleSubCoordinatorChange = (newSubCoordinator) => {
        setModuleSubCoordinator(newSubCoordinator);
        
        setTimeout(() => {
            fetchSubCoordinator();
        }, 500);
    };

    const fetchCoordinator = async () => {
        try {
            const res = await api.get('/coordinators/module/discipular');
            setModuleCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching coordinator:', error);
            // If the endpoint doesn't exist, try to find a coordinator by isCoordinator flag
            try {
                const coordinatorsRes = await api.get('/coordinators', {
                    params: { module: 'discipular' }
                });
                const coordinators = coordinatorsRes.data;
                if (coordinators && coordinators.length > 0) {
                    // Find the first coordinator with ADMIN role or the first one
                    const adminCoordinator = coordinators.find(c => c.role === ROLES.ADMIN) || coordinators[0];
                    setModuleCoordinator(adminCoordinator);
                } else {
                    setModuleCoordinator(null);
                }
            } catch (fallbackError) {
                console.error('Fallback coordinator fetch failed:', fallbackError);
                setModuleCoordinator(null);
            }
        }
    };

    const fetchTreasurer = async () => {
        try {
            const res = await api.get('/coordinators/module/discipular/treasurer');
            setModuleTreasurer(res.data);
        } catch (error) {
            console.error('Error fetching treasurer:', error);
            setModuleTreasurer(null);
        }
    };

    const fetchSubCoordinator = async () => {
        try {
            const res = await api.get('/coordinators/module/discipular/subcoordinator');
            setModuleSubCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching subcoordinator:', error);
            setModuleSubCoordinator(null);
        }
    };

    useEffect(() => {
        fetchCoordinator();
        fetchSubCoordinator();
        fetchTreasurer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tabs = [
        { 
            id: 'management', 
            label: 'Clases y Notas', 
            component: CourseManagement,
            roles: ROLE_GROUPS.CAN_MANAGE_CLASSES
        },
        {
            id: 'matrix',
            label: 'Matriz de Estudiantes',
            component: StudentMatrix,
            roles: ROLE_GROUPS.ALL_LEADERS
        },
        {
            id: 'stats',
            label: 'Reporte Estadístico',
            component: SchoolLeaderStats,
            roles: ROLE_GROUPS.ALL_LEADERS
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Capacitación Destino"
                description="Escuela de Liderazgo"
                action={
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <CoordinatorSelector 
                            moduleCoordinator={moduleCoordinator}
                            moduleName="Discipular"
                            onCoordinatorChange={handleCoordinatorChange}
                            disabled={!hasAdminOrPastor}
                        />
                        <SubCoordinatorSelector 
                            moduleSubCoordinator={moduleSubCoordinator}
                            moduleName="Discipular"
                            onSubCoordinatorChange={handleSubCoordinatorChange}
                            disabled={!hasAdminOrPastor}
                            currentUserId={user?.id}
                            isModuleCoordinator={user?.isCoordinator || isCoordinator()}
                        />
                        <TreasurerSelector 
                            moduleTreasurer={moduleTreasurer}
                            moduleName="Discipular"
                            onTreasurerChange={handleTreasurerChange}
                            disabled={!hasAdminOrPastor}
                            currentUserId={user?.id}
                            isModuleCoordinator={user?.isCoordinator || isCoordinator()}
                        />
                    </div>
                }
            />

            {/* Floating Refresh Button */}
            <div className="fixed bottom-8 right-8 z-40">
                <Button
                    variant="primary"
                    size="sm"
                    icon={ArrowsClockwise}
                    onClick={handleRefresh}
                    className="shadow-xl"
                >
                    Actualizar
                </Button>
            </div>

            <TabNavigator tabs={tabs} initialTabId="management" />
        </div>
    );
};

export default Discipular;
