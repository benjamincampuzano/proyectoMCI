import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import TabNavigator from "../components/TabNavigator";
import CoordinatorDisplay from "../components/CoordinatorDisplay";
import FloatingRefreshButton from "../components/FloatingRefreshButton";
import ChurchAttendance from "../components/ChurchAttendance";
import ChurchAttendanceChart from "../components/ChurchAttendanceChart";
import DiscipleTracking from "../components/DiscipleTracking";
import { ROLE_GROUPS, ROLES } from "../constants/roles";
import { PageHeader, Button } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const Consolidar = () => {
    const { hasAnyRole, isCoordinator, isSubCoordinator, isTreasurer, user } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);
    const [moduleSubCoordinator, setModuleSubCoordinator] = useState(null);
    const [moduleTreasurer, setModuleTreasurer] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const fetchRoles = async () => {
            try {
                const res = await api.get('/coordinators/module/consolidar/roles')
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
            }
        };

        fetchRoles();

        return () => {
            cancelled = true;
        };
    }, [refreshTrigger]);
    const tabs = [
        { id: 'attendance', label: 'Asistencia a la Iglesia', component: ChurchAttendance,
          customCheck: () => {
              const isLoggedIn = !!user;
              const isModuleCoord = isCoordinator('consolidar');
              const isModuleSubCoord = isSubCoordinator('consolidar');
              const isModuleTreasurer = isTreasurer('consolidar');
              return isLoggedIn || isModuleCoord || isModuleSubCoord || isModuleTreasurer;
          } },
        {
            id: 'disciple-tracking',
            label: 'Seguimiento de Discípulos',
            component: DiscipleTracking,
            customCheck: () => {
                const hasRoleAccess = hasAnyRole(ROLE_GROUPS.CAN_VIEW_STATS);
                const isModuleCoord = isCoordinator('consolidar');
                const isModuleSubCoord = isSubCoordinator('consolidar');
                const isModuleTreasurer = isTreasurer('consolidar');
                return hasRoleAccess || isModuleCoord || isModuleSubCoord || isModuleTreasurer;
            }
        },
        {
            id: 'stats',
            label: 'Estadísticas de Asistencia',
            component: ChurchAttendanceChart,
            customCheck: () => {
                const hasRoleAccess = hasAnyRole(ROLE_GROUPS.CAN_VIEW_STATS);
                const isModuleCoord = isCoordinator('consolidar');
                const isModuleSubCoord = isSubCoordinator('consolidar');
                const isModuleTreasurer = isTreasurer('consolidar');
                return hasRoleAccess || isModuleCoord || isModuleSubCoord || isModuleTreasurer;
            }
        }        
    ];

        const handleAttendanceSaveSuccess = () => {
        toast.success('Asistencia guardada exitosamente');
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Consolidar"
                description="Gestión de seguimiento, asistencia y estadísticas"
                action={
                    <div className="flex items-center gap-4">
                        <CoordinatorDisplay
                            coordinator={moduleCoordinator}
                            subCoordinator={moduleSubCoordinator}
                            treasurer={moduleTreasurer}
                            moduleName="Consolidar"
                        />
                    </div>
                }
            />

            {/* Floating Refresh Button */}
            <FloatingRefreshButton
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                label="Actualizar"
                ariaLabel="Actualizar datos del módulo Consolidar"
            />

            <TabNavigator 
                tabs={tabs} 
                initialTabId="attendance" 
                moduleName="consolidar" 
                refreshTrigger={refreshTrigger} 
                componentProps={{
                    onSaveSuccess: handleAttendanceSaveSuccess
                }}
            />
        </div>
    );
};

export default Consolidar;
