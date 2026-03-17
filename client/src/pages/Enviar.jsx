import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import CellManagement from '../components/CellManagement';
import CellAttendance from '../components/CellAttendance';
import AttendanceChart from '../components/AttendanceChart';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { PageHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import CoordinatorSelector from '../components/CoordinatorSelector';
import api from '../utils/api';

const Enviar = () => {
    const { hasAnyRole, isCoordinator } = useAuth();
    const hasAdminOrCoordinator = hasAnyRole([ROLES.ADMIN]) || isCoordinator();
    const [moduleCoordinator, setModuleCoordinator] = useState(null);

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
        { id: 'cells', label: 'Células', component: CellManagement, roles: ROLE_GROUPS.CAN_MANAGE_CELLS },
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
                        disabled={!hasAnyRole([ROLES.ADMIN])}
                    />
                }
            />

            <TabNavigator tabs={tabs} initialTabId="attendance" />
        </div>
    );
};

export default Enviar;
