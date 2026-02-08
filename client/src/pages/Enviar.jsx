import TabNavigator from '../components/TabNavigator';
import CellManagement from '../components/CellManagement';
import CellAttendance from '../components/CellAttendance';
import AttendanceChart from '../components/AttendanceChart';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { PageHeader } from '../components/ui';

const Enviar = () => {
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
            />

            <TabNavigator tabs={tabs} initialTabId="attendance" />
        </div>
    );
};

export default Enviar;
