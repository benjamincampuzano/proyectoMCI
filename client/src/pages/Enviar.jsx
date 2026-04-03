import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import CellManagement from '../components/CellManagement';
import CellAttendance from '../components/CellAttendance';
import AttendanceChart from '../components/AttendanceChart';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { PageHeader, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import CoordinatorSelector from '../components/CoordinatorSelector';
import { ArrowsClockwise } from '@phosphor-icons/react';
import api from '../utils/api';

const Enviar = () => {
    const { user, hasAnyRole, isCoordinator } = useAuth();
    const hasAdminOrPastor = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR]);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);

    // Custom role checker for cells tab - allows coordinators to manage cells
    const hasCellsTabAccess = () => {
        const hasRoleAccess = hasAnyRole(ROLE_GROUPS.CAN_MANAGE_CELLS);
        const isModuleCoord = moduleCoordinator && 
            moduleCoordinator.id === JSON.parse(localStorage.getItem('user') || '{}').id;
        return hasRoleAccess || isModuleCoord;
    };

    // Handler for coordinator changes
    const handleCoordinatorChange = (newCoordinator) => {
        setModuleCoordinator(newCoordinator);
        
        // After a short delay, refresh the coordinator data from server
        if (newCoordinator) {
            setTimeout(() => {
                fetchCoordinator();
            }, 500);
        } else {
            setTimeout(() => {
                fetchCoordinator();
            }, 500);
        }
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

    useEffect(() => {
        fetchCoordinator();
    }, []);
    const tabs = [
        { id: 'attendance', label: 'Asistencia', component: CellAttendance },
        { id: 'cells', label: 'Células', component: (props) => <CellManagement {...props} moduleCoordinator={moduleCoordinator} />, customCheck: hasCellsTabAccess },
        { id: 'stats', label: 'Estadísticas', component: AttendanceChart, roles: ROLE_GROUPS.CAN_VIEW_STATS },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Enviar"
                description="Gestión de asistencia a células y estadísticas"
                action={
                    <CoordinatorSelector 
                        moduleCoordinator={moduleCoordinator}
                        moduleName="Enviar"
                        onCoordinatorChange={handleCoordinatorChange}
                        disabled={!hasAdminOrPastor}
                        currentUserId={user?.id}
                        isModuleCoordinator={user?.isCoordinator || isCoordinator()}
                    />
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

            <TabNavigator tabs={tabs} initialTabId="attendance" />
        </div>
    );
};

export default Enviar;
