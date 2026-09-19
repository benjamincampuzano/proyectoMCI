import { useCallback, useEffect, useMemo, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import CourseManagement from '../components/School/CourseManagement';
import SchoolLeaderStats from '../components/School/SchoolLeaderStats';
import StudentMatrix from '../components/School/StudentMatrix';
import SchoolDashboard from '../components/School/SchoolDashboard';
import RecordGradeModal from '../components/School/RecordGradeModal';
import { PageHeader, Button } from '../components/ui';
import { ROLES } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import CoordinatorDisplay from '../components/CoordinatorDisplay';
import { ArrowsClockwise, NotePencil } from '@phosphor-icons/react';
import api from '../utils/api';

const Discipular = () => {
    const { hasAnyRole, isCoordinator, isSubCoordinator, isTreasurer } = useAuth();
    const isModuleCoordinator = isCoordinator('discipular');
    const isModuleSubCoordinator = isSubCoordinator('discipular');
    const isModuleTreasurer = isTreasurer('discipular');
    const [coordinators, setCoordinators] = useState({ coordinator: null, subCoordinator: null, treasurer: null });
    const [loading, setLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);

    // Load coordinator data (needed for header display)
    const fetchCoordinatorData = useCallback(async () => {
        setLoading(true);
        try {
            const rolesRes = await api.get('/coordinators/module/discipular/roles')
                .catch(() => ({ data: { coordinator: null, subCoordinator: null, treasurer: null } }));

            setCoordinators({
                coordinator: rolesRes.data.coordinator,
                subCoordinator: rolesRes.data.subCoordinator,
                treasurer: rolesRes.data.treasurer
            });
        } catch (error) {
            console.error('Error fetching coordinator data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(fetchCoordinatorData);
    }, [fetchCoordinatorData]);

    const handleRefresh = () => {
        setRefreshTrigger(c => c + 1);
        fetchCoordinatorData();
    };

    const hasManagementAccess = useCallback(() => true, []);

    const hasMatrixAccess = useCallback(() => {
        const userRoles = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR, ROLES.LIDER_DOCE, ROLES.LIDER_CELULA]);
        return userRoles || isModuleCoordinator || isModuleSubCoordinator || isModuleTreasurer;
    }, [hasAnyRole, isModuleCoordinator, isModuleSubCoordinator, isModuleTreasurer]);

    const hasStatsAccess = useCallback(() => {
        const userRoles = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR, ROLES.LIDER_DOCE]);
        return userRoles || isModuleCoordinator || isModuleSubCoordinator || isModuleTreasurer;
    }, [hasAnyRole, isModuleCoordinator, isModuleSubCoordinator, isModuleTreasurer]);

    const tabs = useMemo(() => [
        {
            id: 'dashboard',
            label: 'Resumen',
            component: SchoolDashboard,
            customCheck: hasManagementAccess
        },
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
    ], [hasManagementAccess, hasMatrixAccess, hasStatsAccess]);

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
                                coordinator={coordinators.coordinator}
                                subCoordinator={coordinators.subCoordinator}
                                treasurer={coordinators.treasurer}
                                moduleName="Discipular"
                            />
                        )}
                    </div>
                }
            />

            <div className="fixed bottom-8 right-8 z-40 flex flex-col gap-3 items-end">
                {hasMatrixAccess() && (
                    <Button
                        variant="primary"
                        size="sm"
                        icon={NotePencil}
                        onClick={() => setShowQuickNoteModal(true)}
                        className="shadow-xl"
                    >
                        Registrar Nota
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    icon={ArrowsClockwise}
                    onClick={handleRefresh}
                    className="shadow-xl"
                >
                    Actualizar
                </Button>
            </div>

            <TabNavigator tabs={tabs} initialTabId="dashboard" moduleName="discipular" refreshTrigger={refreshTrigger} />

            <RecordGradeModal
                isOpen={showQuickNoteModal}
                onClose={() => setShowQuickNoteModal(false)}
                onSaved={() => setRefreshTrigger(c => c + 1)}
            />
        </div>
    );
};

export default Discipular;