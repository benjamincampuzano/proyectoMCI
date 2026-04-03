import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import ChurchAttendance from '../components/ChurchAttendance';
import ChurchAttendanceChart from '../components/ChurchAttendanceChart';
import GuestTracking from '../components/GuestTracking';
import GuestTrackingStats from '../components/GuestTrackingStats';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { PageHeader, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import CoordinatorSelector from '../components/CoordinatorSelector';
import { ArrowsClockwise } from '@phosphor-icons/react';
import api from '../utils/api';

const Consolidar = () => {
    const { user, hasAnyRole, isCoordinator } = useAuth();
    const hasAdminOrPastor = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR]);
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
            const res = await api.get('/coordinators/module/consolidar');
            setModuleCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching coordinator:', error);
            // If the endpoint doesn't exist, try to find a coordinator by isCoordinator flag
            try {
                const coordinatorsRes = await api.get('/coordinators', {
                    params: { module: 'consolidar' }
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
        { id: 'tracking', label: 'Seguimiento de Invitados', component: GuestTracking },
        { id: 'stats-tracking', label: 'Estadísticas de Invitados', component: GuestTrackingStats, roles: ROLE_GROUPS.CAN_VIEW_STATS },
        { id: 'attendance', label: 'Asistencia a la Iglesia', component: ChurchAttendance },
        { id: 'stats', label: 'Estadísticas de Asistencia', component: ChurchAttendanceChart, roles: ROLE_GROUPS.ALL_LEADERS }
    ];

        return (
        <div className="space-y-6">
            <PageHeader
                title="Consolidar"
                description="Gestión de seguimiento, asistencia y estadísticas"
                action={
                    <CoordinatorSelector 
                        moduleCoordinator={moduleCoordinator}
                        moduleName="Consolidar"
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

            <TabNavigator tabs={tabs} initialTabId="tracking" />
        </div>
    );
};

export default Consolidar;
