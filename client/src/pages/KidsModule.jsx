import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import KidsCourseManagement from '../components/Kids/KidsCourseManagement';
import KidsSchedule from '../components/Kids/KidsSchedule';
import KidsStudentMatrix from '../components/Kids/KidsStudentMatrix';
import KidsStats from '../components/Kids/KidsStats';
import { PageHeader, Button } from '../components/ui';
import { ROLES } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import CoordinatorDisplay from '../components/CoordinatorDisplay';
import { ArrowsClockwise } from '@phosphor-icons/react';
import api from '../utils/api';

const KidsModule = () => {
    const { hasAnyRole, isCoordinator, isSubCoordinator, isTreasurer } = useAuth();
    const [isKidsTeacherOrAuxiliary, setIsKidsTeacherOrAuxiliary] = useState(null);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);
    const [moduleSubCoordinator, setModuleSubCoordinator] = useState(null);
    const [moduleTreasurer, setModuleTreasurer] = useState(null);
    const [loading, setLoading] = useState(false);

    // Load coordinator data on mount (needed for header display)
    useEffect(() => {
        const fetchCoordinatorData = async () => {
            setLoading(true);
            try {
                const rolesRes = await api.get('/coordinators/module/kids/roles')
                    .catch(() => ({ data: { coordinator: null, subCoordinator: null, treasurer: null } }));

                setModuleCoordinator(rolesRes.data.coordinator);
                setModuleSubCoordinator(rolesRes.data.subCoordinator);
                setModuleTreasurer(rolesRes.data.treasurer);
            } catch (error) {
                console.error('Error fetching coordinator data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCoordinatorData();
    }, []);

    // Lazy load teacher access data only when needed
    const fetchTeacherAccess = async () => {
        try {
            const teacherRes = await api.get('/kids/students/check-access')
                .catch(() => ({ data: { hasAccess: false } }));
            setIsKidsTeacherOrAuxiliary(teacherRes.data.hasAccess);
        } catch (error) {
            console.error('Error fetching teacher access:', error);
            setIsKidsTeacherOrAuxiliary(false);
        }
    };

    const handleRefresh = () => {
        const fetchCoordinatorData = async () => {
            setLoading(true);
            try {
                const rolesRes = await api.get('/coordinators/module/kids/roles')
                    .catch(() => ({ data: { coordinator: null, subCoordinator: null, treasurer: null } }));

                setModuleCoordinator(rolesRes.data.coordinator);
                setModuleSubCoordinator(rolesRes.data.subCoordinator);
                setModuleTreasurer(rolesRes.data.treasurer);
            } catch (error) {
                console.error('Error fetching coordinator data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCoordinatorData();
    };

    // Function to check if user has full access to Kids module (ADMIN, PASTOR, Coordinator, Subcoordinator, Treasurer)
    const hasFullKidsAccess = () => {
        return hasAnyRole(['ADMIN', 'PASTOR']) ||
               isCoordinator('kids') ||
               isSubCoordinator('kids') ||
               isTreasurer('kids');
    };

    const tabs = [
        {
            id: 'schedule',
            label: 'Cronograma',
            component: (props) => <KidsSchedule {...props} moduleCoordinator={moduleCoordinator} />,
            customCheck: hasFullKidsAccess,
            onTabSelect: fetchModuleData
        },
        {
            id: 'management',
            label: 'Clases y Notas',
            component: KidsCourseManagement,
            customCheck: hasFullKidsAccess,
            onTabSelect: fetchModuleData
        },
        {
            id: 'matrix',
            label: 'Matriz de Estudiantes',
            component: KidsStudentMatrix,
            customCheck: hasFullKidsAccess,
            onTabSelect: fetchModuleData
        },
        {
            id: 'stats',
            label: 'Reporte Estadístico',
            component: KidsStats,
            customCheck: hasFullKidsAccess,
            onTabSelect: fetchModuleData
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

            <TabNavigator tabs={tabs} initialTabId="schedule" moduleName="kids" refreshTrigger={refreshKey} />
        </div>
    );
};

export default KidsModule;