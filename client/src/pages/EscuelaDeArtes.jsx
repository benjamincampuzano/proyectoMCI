import { useEffect, useState } from 'react';
import TabNavigator from '../components/TabNavigator';
import { PageHeader, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ArrowsClockwise } from '@phosphor-icons/react';
import api from '../utils/api';

// Components (We will create these next)
import RoleManagement from '../components/ArtSchool/RoleManagement';
import ClassManagement from '../components/ArtSchool/ClassManagement';
import EnrollmentManagement from '../components/ArtSchool/EnrollmentManagement';
import AttendanceTracker from '../components/ArtSchool/AttendanceTracker';
import PaymentManager from '../components/ArtSchool/PaymentManager';

const EscuelaDeArtes = () => {
    const { user, hasAnyRole } = useAuth();
    const isAdmin = hasAnyRole(['ADMIN']);
    const [userRoles, setUserRoles] = useState([]);
    
    // Check if user has explicit module roles
    const hasModuleRole = (roleList) => {
        if (isAdmin) return true; // Admin has all powers
        return userRoles.some(r => roleList.includes(r.role));
    };

    const isCoordinator = hasModuleRole(['COORDINADOR']);
    const isTesorero = hasModuleRole(['TESORERO']);
    const isProfesor = hasModuleRole(['PROFESOR']);
    const isEstudiante = hasModuleRole(['ESTUDIANTE']);

    const fetchRoles = async () => {
        if (isAdmin) return; // Admins don't strictly need their art roles fetched to function
        try {
            const res = await api.get(`/arts/roles/${user.id}`);
            setUserRoles(res.data);
        } catch (error) {
            console.error('Error fetching art school roles', error);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, [user.id]);

    const handleRefresh = () => {
        fetchRoles();
    };

    const tabs = [];

    // All roles can see classes and enrollments, but logic inside components will limit actions
    if (isAdmin || isCoordinator || isProfesor) {
        tabs.push({ 
            id: 'classes', 
            label: 'Clases', 
            component: ClassManagement 
        });
        tabs.push({
            id: 'enrollments',
            label: 'Inscripciones',
            component: EnrollmentManagement
        });
    }

    // All roles can see attendance (students see read-only their own)
    if (isAdmin || isCoordinator || isProfesor || isEstudiante) {
        tabs.push({
            id: 'attendance',
            label: 'Asistencias',
            component: AttendanceTracker
        });
    }

    // All roles can see payments (students see their own)
    if (isAdmin || isCoordinator || isTesorero || isProfesor || isEstudiante) {
        tabs.push({
            id: 'payments',
            label: 'Abonos y Pagos',
            component: PaymentManager
        });
    }

    // Only Admin/Coordinators can manage roles
    if (isAdmin || isCoordinator) {
        tabs.push({
            id: 'roles',
            label: 'Gestión de Roles',
            component: RoleManagement
        });
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Escuela de Artes"
                description="Gestión de clases de arte, inscripciones, asistencias y abonos."
            />

            <div className="fixed bottom-8 right-8 z-40">
                <Button
                    variant="primary"
                    size="sm"
                    icon={ArrowsClockwise}
                    onClick={handleRefresh}
                    className="shadow-xl"
                >
                    Actualizar
                </Button>
            </div>

            {tabs.length > 0 ? (
                <TabNavigator tabs={tabs} initialTabId={tabs[0].id} />
            ) : (
                <div className="p-8 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl">
                    <p>No tienes asignado un rol en la Escuela de Artes.</p>
                </div>
            )}
        </div>
    );
};

export default EscuelaDeArtes;
