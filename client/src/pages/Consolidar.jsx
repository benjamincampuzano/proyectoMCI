import TabNavigator from '../components/TabNavigator';
import ChurchAttendance from '../components/ChurchAttendance';
import ChurchAttendanceChart from '../components/ChurchAttendanceChart';
import GuestTracking from '../components/GuestTracking';
import GuestTrackingStats from '../components/GuestTrackingStats';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { PageHeader } from '../components/ui';

const Consolidar = () => {
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
            />

            <TabNavigator tabs={tabs} initialTabId="tracking" />
        </div>
    );
};

export default Consolidar;
