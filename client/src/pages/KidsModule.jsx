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
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                const [coordinatorRes, subCoordinatorRes, treasurerRes, teacherRes] = await Promise.all([
                    api.get('/coordinators/module/kids').catch(() => ({ data: null })),
                    api.get('/coordinators/module/kids/subcoordinator').catch(() => ({ data: null })),
                    api.get('/coordinators/module/kids/treasurer').catch(() => ({ data: null })),
                    api.get('/kids/students/check-access').catch(() => ({ data: { hasAccess: false } }))
                ]);

                if (isMounted) {
                    setModuleCoordinator(coordinatorRes.data);
                    setModuleSubCoordinator(subCoordinatorRes.data);
                    setModuleTreasurer(treasurerRes.data);
                    setIsKidsTeacherOrAuxiliary(teacherRes.data.hasAccess);
                }
            } catch (error) {
                console.error('Error fetching module data:', error);
                if (isMounted) {
                    setModuleCoordinator(null);
                    setModuleSubCoordinator(null);
                    setModuleTreasurer(null);
                    setIsKidsTeacherOrAuxiliary(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [refreshKey]);

    const handleRefresh = () => setRefreshKey(k => k + 1);

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
            customCheck: hasFullKidsAccess
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Módulo Kids"
                description="Escuela infantil: Kids 1 (5-7), Kids 2 (8 a 10), Teens (11-13) y Jóvenes (14+)"
                action={
                    <div className="flex items-center gap-4">
                        <CoordinatorDisplay
                            coordinator={moduleCoordinator}
                            subCoordinator={moduleSubCoordinator}
                            treasurer={moduleTreasurer}
                            moduleName="Kids"
                        />
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

            <TabNavigator tabs={tabs} initialTabId="schedule" moduleName="kids" />
        </div>
    );
};

export default KidsModule;