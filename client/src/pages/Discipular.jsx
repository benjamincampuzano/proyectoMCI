import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import CourseManagement from '../components/School/CourseManagement';
import SchoolLeaderStats from '../components/School/SchoolLeaderStats';
import StudentMatrix from '../components/School/StudentMatrix';
import { PageHeader } from '../components/ui';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import CoordinatorSelector from '../components/CoordinatorSelector';
import api from '../utils/api';

const Discipular = () => {
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
            const res = await api.get('/coordinators/module/discipular');
            setModuleCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching coordinator:', error);
            // If the endpoint doesn't exist, try to find a coordinator by isCoordinator flag
            try {
                const coordinatorsRes = await api.get('/coordinators', {
                    params: { module: 'discipular' }
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
        { 
            id: 'management', 
            label: 'Clases y Notas', 
            component: CourseManagement,
            roles: ROLE_GROUPS.CAN_MANAGE_CLASSES
        },
        {
            id: 'matrix',
            label: 'Matriz de Estudiantes',
            component: StudentMatrix,
            roles: ROLE_GROUPS.ALL_LEADERS
        },
        {
            id: 'stats',
            label: 'Reporte Estadístico',
            component: SchoolLeaderStats,
            roles: ROLE_GROUPS.ALL_LEADERS
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Capacitación Destino"
                description="Escuela de Liderazgo"
                action={
                    <CoordinatorSelector 
                        moduleCoordinator={moduleCoordinator}
                        moduleName="Discipular"
                        onCoordinatorChange={handleCoordinatorChange}
                        disabled={!hasAnyRole([ROLES.ADMIN])}
                    />
                }
            />

            <TabNavigator tabs={tabs} initialTabId="management" />
        </div>
    );
};

export default Discipular;
