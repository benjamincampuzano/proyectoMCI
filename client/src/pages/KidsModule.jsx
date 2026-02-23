import TabNavigator from '../components/TabNavigator';
import KidsCourseManagement from '../components/Kids/KidsCourseManagement';
import KidsStudentMatrix from '../components/Kids/KidsStudentMatrix';
import KidsStats from '../components/Kids/KidsStats';
import { PageHeader } from '../components/ui';
import { ROLE_GROUPS } from '../constants/roles';

const KidsModule = () => {
    const tabs = [
        { 
            id: 'management', 
            label: 'Clases y Notas', 
            component: KidsCourseManagement,
            roles: ROLE_GROUPS.CAN_MANAGE_CLASSES
        },
        {
            id: 'matrix',
            label: 'Matriz de Estudiantes',
            component: KidsStudentMatrix,
            roles: ROLE_GROUPS.ALL_LEADERS
        },
        {
            id: 'stats',
            label: 'Reporte Estadístico',
            component: KidsStats,
            roles: ROLE_GROUPS.ALL_LEADERS
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Módulo Kids"
                description="Escuela infantil: Kids (5-10), Rocas (11-13) y Jóvenes (14+)"
            />

            <TabNavigator tabs={tabs} initialTabId="management" />
        </div>
    );
};

export default KidsModule;
