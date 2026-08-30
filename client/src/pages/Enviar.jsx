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
    const hasFullEnviarAccess = hasAnyRole(['ADMIN', 'PASTOR']) ||
        isModuleCoordinator ||
        isModuleSubCoordinator ||
        isModuleTreasurer;

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await api.get('/coordinators/module/enviar/roles')
                .catch(() => ({ data: { coordinator: null, subCoordinator: null, treasurer: null } }));

            setModuleCoordinator(res.data.coordinator);
            setModuleSubCoordinator(res.data.subCoordinator);
            setModuleTreasurer(res.data.treasurer);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error fetching module roles:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const canRead = () => hasViewStatsAccess || hasFullEnviarAccess || hasAnyRole(['DISCIPULO']);

    const hasCellsTabAccess = () => {
        return hasAnyRole(ROLE_GROUPS.CAN_MANAGE_CELLS) || hasFullEnviarAccess || isModuleCoordinator || canRead();
    };

    const hasUnassignedAccess = () => {
        return hasFullEnviarAccess;
    };

    const tabs = [
        { id: 'attendance', label: 'Reporte de Asistencia', component: CellAttendance, customCheck: canRead },
        { id: 'cells', label: 'Células', component: CellManagement, customCheck: hasCellsTabAccess },
        { id: 'stats', label: 'Estadísticas', component: AttendanceChart, customCheck: canRead },
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
                    onClick={fetchRoles}
                    className="shadow-xl"
                >
                    Actualizar
                </Button>
            </div>

            <TabNavigator
                tabs={tabs}
                initialTabId="attendance"
                moduleName="enviar"
                refreshTrigger={refreshTrigger}
                componentProps={{
                    moduleCoordinator,
                    moduleSubCoordinator,
                    moduleTreasurer,
                }}
            />
        </div>
    );
};

export default Enviar;
