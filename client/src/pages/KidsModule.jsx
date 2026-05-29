import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import KidsCourseManagement from '../components/Kids/KidsCourseManagement';
import KidsSchedule from '../components/Kids/KidsSchedule';
import KidsStudentMatrix from '../components/Kids/KidsStudentMatrix';
import KidsStats from '../components/Kids/KidsStats';
import { PageHeader, Button } from '../components/ui';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import CoordinatorDisplay from '../components/CoordinatorDisplay';
import { ArrowsClockwise } from '@phosphor-icons/react';
import api from '../utils/api';

const KidsModule = () => {
    const { hasAnyRole, isCoordinator, isSubCoordinator, isTreasurer } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);
    const [moduleSubCoordinator, setModuleSubCoordinator] = useState(null);
    const [moduleTreasurer, setModuleTreasurer] = useState(null);
    const [loading, setLoading] = useState(false);

    // Load coordinator data on mount and when manually refreshed
    useEffect(() => {
        let cancelled = false;

        const fetchCoordinatorData = async () => {
            setLoading(true);
            try {
                const rolesRes = await api.get('/coordinators/module/kids/roles')
                    .catch(() => ({ data: { coordinator: null, subCoordinator: null, treasurer: null } }));

                if (!cancelled) {
                    setModuleCoordinator(rolesRes.data.coordinator);
                    setModuleSubCoordinator(rolesRes.data.subCoordinator);
                    setModuleTreasurer(rolesRes.data.treasurer);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Error fetching coordinator data:', error);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchCoordinatorData();

        return () => {
            cancelled = true;
        };
    }, [refreshTrigger]);

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // Function to check if user has full access to Kids module (ADMIN, PASTOR, Coordinator, Subcoordinator, Treasurer)
    const hasFullKidsAccess = () => {
        return hasAnyRole(['ADMIN', 'PASTOR']) ||
               isCoordinator('kids') ||
               isSubCoordinator('kids') ||
               isTreasurer('kids');
    };

    const hasStatsAccess = () => {
        return hasFullKidsAccess() || hasAnyRole(ROLE_GROUPS.CAN_VIEW_STATS);
    };

    const tabs = [
        {
            id: 'schedule',
            label: 'Cronograma',
            component: (props) => <KidsSchedule {...props} moduleCoordinator={moduleCoordinator} />,
            customCheck: hasFullKidsAccess
        },
        {
            id: 'management',
            label: 'Clases y Notas',
            component: KidsCourseManagement,
            customCheck: hasFullKidsAccess
        },
        {
            id: 'matrix',
            label: 'Matriz de Estudiantes',
            component: KidsStudentMatrix,
            customCheck: hasFullKidsAccess
        },
        {
            id: 'stats',
            label: 'Reporte Estadístico',
            component: KidsStats,
            customCheck: hasStatsAccess
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Módulo Kids"
                description="Escuela infantil: Kids 1 (5-7), Kids 2 (8 a 10), Teens (11-13) y Jóvenes (14+)"
                action={
                    <div className="flex items-center gap-4">
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        ) : (
                            <CoordinatorDisplay
                                coordinator={moduleCoordinator}
                                subCoordinator={moduleSubCoordinator}
                                treasurer={moduleTreasurer}
                                moduleName="Kids"
                            />
                        )}
                    </div>
                }
            />

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

            <TabNavigator tabs={tabs} initialTabId="schedule" moduleName="kids" refreshTrigger={refreshTrigger} />
        </div>
    );
};

export default KidsModule;
