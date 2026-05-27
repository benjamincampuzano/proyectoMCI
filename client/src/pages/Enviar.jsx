import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import CellManagement from '../components/CellManagement';
import CellAttendance from '../components/CellAttendance';
import AttendanceChart from '../components/AttendanceChart';
import UnassignedPeople from '../components/UnassignedPeople';
import { ROLE_GROUPS } from '../constants/roles';
import { PageHeader, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import CoordinatorDisplay from '../components/CoordinatorDisplay';
import { ArrowsClockwise } from '@phosphor-icons/react';
import api from '../utils/api';

const Enviar = () => {
    const { user, hasAnyRole, isCoordinator, isSubCoordinator, isTreasurer } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);
    const [moduleSubCoordinator, setModuleSubCoordinator] = useState(null);
    const [moduleTreasurer, setModuleTreasurer] = useState(null);
    const [loading, setLoading] = useState(false);

    const isModuleCoordinator = isCoordinator('enviar');
    const isModuleSubCoordinator = isSubCoordinator('enviar');
    const isModuleTreasurer = isTreasurer('enviar');
    const hasViewStatsAccess = hasAnyRole(ROLE_GROUPS.CAN_VIEW_STATS);

    useEffect(() => {
        let cancelled = false;

        const fetchRoles = async () => {
            setLoading(true);
            try {
                const res = await api.get('/coordinators/module/enviar/roles')
                    .catch(() => ({ data: { coordinator: null, subCoordinator: null, treasurer: null } }));
                if (!cancelled) {
                    const { coordinator, subCoordinator, treasurer } = res.data;
                    setModuleCoordinator(coordinator);
                    setModuleSubCoordinator(subCoordinator);
                    setModuleTreasurer(treasurer);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Error fetching module roles:', error);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchRoles();

        return () => {
            cancelled = true;
        };
    }, [refreshTrigger]);

    const hasCellsTabAccess = () => {
        const hasRoleAccess = hasAnyRole(ROLE_GROUPS.CAN_MANAGE_CELLS);
        const isModuleCoord = moduleCoordinator?.id === user?.id;
        return hasRoleAccess || isModuleCoord || isModuleSubCoordinator || hasAnyRole(['DISCIPULO']);
    };

    const hasAttendanceAccess = () => {
        return hasViewStatsAccess || isModuleCoordinator || isModuleSubCoordinator || hasAnyRole(['DISCIPULO']);
    };

    // Política de acceso: DISCIPULO tiene permiso de solo lectura en todas las pestañas del módulo Enviar
    const hasStatsAccess = () => {
        return hasViewStatsAccess || isModuleCoordinator || isModuleSubCoordinator || isModuleTreasurer || hasAnyRole(['DISCIPULO']);
    };

    const hasUnassignedAccess = () => {
        const hasRoleAccess = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);
        return hasRoleAccess || isModuleCoordinator || isModuleSubCoordinator || isModuleTreasurer;
    };

    const tabs = [
        { id: 'cells', label: 'Células', component: CellManagement, customCheck: hasCellsTabAccess },
        { id: 'attendance', label: 'Reporte de Asistencia', component: CellAttendance, customCheck: hasAttendanceAccess },
        { id: 'stats', label: 'Estadísticas', component: AttendanceChart, customCheck: hasStatsAccess },
        { id: 'unassigned', label: 'Personas sin Célula', component: UnassignedPeople, customCheck: hasUnassignedAccess },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Enviar"
                description="Gestión de asistencia a células y estadísticas"
                action={
                    <div className="flex items-center gap-4">
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                        ) : (
                            <CoordinatorDisplay
                                coordinator={moduleCoordinator}
                                subCoordinator={moduleSubCoordinator}
                                treasurer={moduleTreasurer}
                                moduleName="Enviar"
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
                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                    className="shadow-xl"
                >
                    Actualizar
                </Button>
            </div>

            <TabNavigator
                tabs={tabs}
                initialTabId="cells"
                moduleName="enviar"
                refreshTrigger={refreshTrigger}
                componentProps={{ moduleCoordinator }}
            />
        </div>
    );
};

export default Enviar;
