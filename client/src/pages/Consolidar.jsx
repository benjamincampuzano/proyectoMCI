import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import ChurchAttendance from '../components/ChurchAttendance';
import ChurchAttendanceChart from '../components/ChurchAttendanceChart';
import GuestTracking from '../components/GuestTracking';
import GuestTrackingStats from '../components/GuestTrackingStats';
import { ROLE_GROUPS, ROLES } from '../constants/roles';
import { PageHeader, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import CoordinatorDisplay from '../components/CoordinatorDisplay';
import { ArrowsClockwise } from '@phosphor-icons/react';
import api from '../utils/api';
import toast from 'react-hot-toast';

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
            <div className="fixed bottom-8 right-8 z-40">
                <button
                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                    className="flex items-center gap-2.5 px-4 py-2.5 bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-accent-hover)] text-white rounded-xl weight-510 text-[13px] transition-all shadow-lg shadow-[var(--ln-brand-indigo)]/20 active:scale-95"
                >
                    <ArrowsClockwise className="w-4 h-4" weight="bold" />
                    Actualizar
                </button>
            </div>

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
