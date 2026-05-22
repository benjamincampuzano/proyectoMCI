import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import CellManagement from '../components/CellManagement';
import CellAttendance from '../components/CellAttendance';
import AttendanceChart from '../components/AttendanceChart';
import UnassignedPeople from '../components/UnassignedPeople';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
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

    // Custom role checker for cells tab - allows coordinators to manage cells
    const hasCellsTabAccess = () => {
        const hasRoleAccess = hasAnyRole(ROLE_GROUPS.CAN_MANAGE_CELLS);
        const isModuleCoord = !!(moduleCoordinator?.id && user?.id && String(moduleCoordinator.id) === String(user.id));
        const isModuleSubCoord = isSubCoordinator('enviar');
        return hasRoleAccess || isModuleCoord || isModuleSubCoord;
    };

    useEffect(() => {
        let cancelled = false;

        const fetchCoordinator = async () => {
            try {
                const res = await api.get('/coordinators/module/enviar');
                if (!cancelled) setModuleCoordinator(res.data);
            } catch (error) {
                if (!cancelled) {
                    console.error('Error fetching coordinator:', error);
                    try {
                        const coordinatorsRes = await api.get('/coordinators', {
                            params: { module: 'enviar' }
                        });
                        const coordinators = coordinatorsRes.data;
                        if (coordinators && coordinators.length > 0) {
                            const adminCoordinator = coordinators.find(c => c.role === 'ADMIN') || coordinators[0];
                            if (!cancelled) setModuleCoordinator(adminCoordinator);
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
                const res = await api.get('/coordinators/module/enviar/subcoordinator');
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
    const tabs = [
        { id: 'cells', label: 'Células', component: (props) => <CellManagement {...props} moduleCoordinator={moduleCoordinator} />, customCheck: hasCellsTabAccess },
        {
            id: 'attendance',
            label: 'Reporte de Asistencia',
            component: CellAttendance,
            customCheck: () => {
                const hasRoleAccess = hasAnyRole(ROLE_GROUPS.CAN_VIEW_STATS);
                const isModuleCoord = isCoordinator('enviar');
                const isModuleSubCoord = isSubCoordinator('enviar');
                return hasRoleAccess || isModuleCoord || isModuleSubCoord;
            }
        },
        {
            id: 'stats',
            label: 'Estadísticas',
            component: AttendanceChart,
            customCheck: () => {
                const hasRoleAccess = hasAnyRole(ROLE_GROUPS.CAN_VIEW_STATS);
                const isModuleCoord = isCoordinator('enviar');
                const isModuleSubCoord = isSubCoordinator('enviar');
                const isModuleTreasurer = isTreasurer('enviar');
                return hasRoleAccess || isModuleCoord || isModuleSubCoord || isModuleTreasurer;
            }
        },
        {
            id: 'unassigned',
            label: 'Personas sin Célula',
            component: UnassignedPeople,
            customCheck: () => {
                const hasRoleAccess = hasAnyRole(ROLE_GROUPS.CAN_VIEW_STATS);
                const isModuleCoord = isCoordinator('enviar');
                const isModuleSubCoord = isSubCoordinator('enviar');
                const isModuleTreasurer = isTreasurer('enviar');
                return hasRoleAccess || isModuleCoord || isModuleSubCoord || isModuleTreasurer;
            }
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Enviar"
                description="Gestión de asistencia a células y estadísticas"
                action={
                    <div className="flex items-center gap-4">
                        <CoordinatorDisplay
                            coordinator={moduleCoordinator}
                            subCoordinator={moduleSubCoordinator}
                            moduleName="Enviar"
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
                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                    className="shadow-xl"
                >
                    Actualizar
                </Button>
            </div>

            <TabNavigator tabs={tabs} initialTabId="cells" moduleName="enviar" refreshTrigger={refreshTrigger} />
        </div>
    );
};

export default Enviar;
