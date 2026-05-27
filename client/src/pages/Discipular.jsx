import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import CourseManagement from '../components/School/CourseManagement';
import SchoolLeaderStats from '../components/School/SchoolLeaderStats';
import StudentMatrix from '../components/School/StudentMatrix';
import { PageHeader, Button } from '../components/ui';
import { ROLES } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import CoordinatorDisplay from '../components/CoordinatorDisplay';
import { ArrowsClockwise } from '@phosphor-icons/react';
import api from '../utils/api';

const Discipular = () => {
    const { hasAnyRole, isCoordinator, isSubCoordinator, isTreasurer } = useAuth();
    const isModuleCoordinator = isCoordinator('discipular');
    const isModuleSubCoordinator = isSubCoordinator('discipular');
    const isModuleTreasurer = isTreasurer('discipular');
    const [moduleCoordinator, setModuleCoordinator] = useState(null);
    const [moduleSubCoordinator, setModuleSubCoordinator] = useState(null);
    const [moduleTreasurer, setModuleTreasurer] = useState(null);
    const [loading, setLoading] = useState(false);

    // Load coordinator data on mount (needed for header display)
    useEffect(() => {
        const fetchCoordinatorData = async () => {
            setLoading(true);
            try {
                const rolesRes = await api.get('/coordinators/module/discipular/roles')
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

    const handleRefresh = () => {
        const fetchCoordinatorData = async () => {
            setLoading(true);
            try {
                const rolesRes = await api.get('/coordinators/module/discipular/roles')
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

    const hasManagementAccess = () => true;

    const hasMatrixAccess = () => {
        const userRoles = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR, ROLES.LIDER_DOCE, ROLES.LIDER_CELULA]);
        return userRoles || isModuleCoordinator || isModuleSubCoordinator || isModuleTreasurer;
    };

    const hasStatsAccess = () => {
        const userRoles = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR, ROLES.LIDER_DOCE]);
        return userRoles || isModuleCoordinator || isModuleSubCoordinator || isModuleTreasurer;
    };

    const tabs = [
        {
            id: 'management',
            label: 'Clases y Notas',
            component: CourseManagement,
            customCheck: hasManagementAccess
        },
        {
            id: 'matrix',
            label: 'Matriz de Estudiantes',
            component: StudentMatrix,
            customCheck: hasMatrixAccess
        },
        {
            id: 'stats',
            label: 'Reporte Estadístico',
            component: SchoolLeaderStats,
            customCheck: hasStatsAccess
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Capacitación Destino"
                description="Escuela de Liderazgo"
                action={
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        ) : (
                            <CoordinatorDisplay
                                coordinator={moduleCoordinator}
                                subCoordinator={moduleSubCoordinator}
                                treasurer={moduleTreasurer}
                                moduleName="Discipular"
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

            <TabNavigator tabs={tabs} initialTabId="management" moduleName="discipular" />
        </div>
    );
};

export default Discipular;