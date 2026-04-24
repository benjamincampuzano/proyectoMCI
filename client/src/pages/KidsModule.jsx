import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import KidsCourseManagement from '../components/Kids/KidsCourseManagement';
import KidsSchedule from '../components/Kids/KidsSchedule';
import KidsStudentMatrix from '../components/Kids/KidsStudentMatrix';
import KidsStats from '../components/Kids/KidsStats';
import { PageHeader, Button } from '../components/ui';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { ArrowsClockwise } from '@phosphor-icons/react';
import api from '../utils/api';

const KidsModule = () => {
    const { user, hasAnyRole, isCoordinator } = useAuth();
    const [isKidsTeacherOrAuxiliary, setIsKidsTeacherOrAuxiliary] = useState(null);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);
    const hasAdminOrPastor = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR]);

    const checkIfKidsTeacherOrAuxiliary = async () => {
        try {
            const res = await api.get('/kids/students/check-access');
            setIsKidsTeacherOrAuxiliary(res.data.hasAccess);
        } catch (error) {
            console.error('Error checking KIDS teacher/auxiliary access:', error);
            setIsKidsTeacherOrAuxiliary(false);
        }
    };

    const fetchCoordinator = async () => {
        try {
            const res = await api.get('/coordinators/module/kids');
            setModuleCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching coordinator:', error);
            setModuleCoordinator(null);
        }
    };

    const fetchSubCoordinator = async () => {
        try {
            const res = await api.get('/coordinators/module/kids/subcoordinator');
        } catch (error) {
            console.error('Error fetching subcoordinator:', error);
        }
    };

    useEffect(() => {
        checkIfKidsTeacherOrAuxiliary();
        fetchCoordinator();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Define roles for specific tabs
    const SCHEDULE_AND_MATRIX_ROLES = [ROLES.ADMIN, ROLES.PASTOR, ROLES.LIDER_DOCE, ROLES.LIDER_CELULA];
    
    // Custom role checker for schedule and matrix tabs
    const hasScheduleOrMatrixAccess = () => {
        const userRoles = hasAnyRole(SCHEDULE_AND_MATRIX_ROLES);
        const isCoord = moduleCoordinator && moduleCoordinator.id === JSON.parse(localStorage.getItem('user') || '{}').id;
        const isTeacherOrAuxiliary = isKidsTeacherOrAuxiliary === true;
        
        return userRoles || isCoord || isTeacherOrAuxiliary;
    };
    
    const tabs = [
        {
            id: 'schedule',
            label: 'Cronograma',
            component: (props) => <KidsSchedule {...props} moduleCoordinator={moduleCoordinator} />,
            customCheck: hasScheduleOrMatrixAccess
        },
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
            customCheck: hasScheduleOrMatrixAccess
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
                description="Escuela infantil: Kids 1 (5-7), Kids 2 (8 a 10), Teens (11-13) y Jóvenes (14+)"
                action={
                    <div className="flex items-center gap-4">
                    </div>
                }
            />

            {/* Floating Refresh Button */}
            <div className="fixed bottom-8 right-8 z-40">
                <Button
                    variant="primary"
                    size="sm"
                    icon={ArrowsClockwise}
                    onClick={() => {
                        fetchCoordinator();
                        fetchSubCoordinator();
                    }}
                    className="shadow-xl"
                >
                    Actualizar
                </Button>
            </div>

            <TabNavigator tabs={tabs} initialTabId="schedule" moduleName="kids" />
        </div>
    );
};

export default KidsModule;
