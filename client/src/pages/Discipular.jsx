import TabNavigator from '../components/TabNavigator';
import CourseManagement from '../components/School/CourseManagement';
import SchoolLeaderStats from '../components/School/SchoolLeaderStats';
import { PageHeader } from '../components/ui';
import { ROLES, ROLE_GROUPS } from '../constants/roles';

const Discipular = () => {
    const tabs = [
        { id: 'management', label: 'Clases y Notas', component: CourseManagement },
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
            />

            <TabNavigator tabs={tabs} initialTabId="management" />
        </div>
    );
};

export default Discipular;
