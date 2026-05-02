import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import CellManagement from '../components/CellManagement';
import CellAttendance from '../components/CellAttendance';
import AttendanceChart from '../components/AttendanceChart';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { PageHeader, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import CoordinatorDisplay from '../components/CoordinatorDisplay';
import { ArrowsClockwise } from '@phosphor-icons/react';
import api from '../utils/api';

const Enviar = () => {
    const { user, hasAnyRole, isCoordinator, isSubCoordinator, isTreasurer } = useAuth();
    const hasAdminOrPastor = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR]);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);
    const [moduleSubCoordinator, setModuleSubCoordinator] = useState(null);

    // Custom role checker for cells tab - allows coordinators to manage cells
    const hasCellsTabAccess = () => {
        const hasRoleAccess = hasAnyRole(ROLE_GROUPS.CAN_MANAGE_CELLS);
        const isModuleCoord = moduleCoordinator && 
            moduleCoordinator.id === JSON.parse(localStorage.getItem('user') || '{}').id;
        const isModuleSubCoord = user?.moduleSubCoordinations?.includes('enviar');
        return hasRoleAccess || isModuleCoord || isModuleSubCoord;
    };

    const fetchCoordinator = async () => {
        try {
            const res = await api.get('/coordinators/module/enviar');
            setModuleCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching coordinator:', error);
            // If the endpoint doesn't exist, try to find a coordinator by isCoordinator flag
            try {
                const coordinatorsRes = await api.get('/coordinators', {
                    params: { module: 'enviar' }
                });
                const coordinators = coordinatorsRes.data;
                if (coordinators && coordinators.length > 0) {
                    // Find the first coordinator with ADMIN role or the first one
                    const adminCoordinator = coordinators.find(c => c.role === 'ADMIN') || coordinators[0];
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

    const fetchSubCoordinator = async () => {
        try {
            const res = await api.get('/coordinators/module/enviar/subcoordinator');
            setModuleSubCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching subcoordinator:', error);
            setModuleSubCoordinator(null);
        }
    };

    useEffect(() => {
        fetchCoordinator();
        fetchSubCoordinator();
    }, []);
    const tabs = [
        { id: 'cells', label: 'Células', component: (props) => <CellManagement {...props} moduleCoordinator={moduleCoordinator} />, customCheck: hasCellsTabAccess },
        { id: 'cell-management', label: 'Gestión de Células', component: (props) => <CellAttendance {...props} moduleCoordinator={moduleCoordinator} />, customCheck: () => true },
        { 
            id: 'attendance', 
            label: 'Asistencia', 
            component: CellAttendance,
            customCheck: () => {
                const isModuleCoord = isCoordinator('enviar');
                const isModuleSubCoord = user?.moduleSubCoordinations?.includes('enviar');
                return isModuleCoord || isModuleSubCoord;
            }
        },
        { 
            id: 'stats', 
            label: 'Estadísticas', 
            component: AttendanceChart, 
            customCheck: () => {
                const hasRoleAccess = hasAnyRole(ROLE_GROUPS.CAN_VIEW_STATS);
                const isModuleCoord = isCoordinator('enviar');
                const isModuleSubCoord = user?.moduleSubCoordinations?.includes('enviar');
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
                    onClick={() => window.location.reload()}
                    className="shadow-xl"
                >
                    Actualizar
                </Button>
            </div>

            <TabNavigator tabs={tabs} initialTabId="cells" moduleName="enviar" />
        </div>
    );
};

export default Enviar;
