import { useEffect, useState } from "react";
import TabNavigator from "../components/TabNavigator";
import CoordinatorDisplay from "../components/CoordinatorDisplay";
import FloatingRefreshButton from "../components/FloatingRefreshButton";
import KidsCourseManagement from "../components/Kids/KidsCourseManagement";
import KidsSchedule from "../components/Kids/KidsSchedule";
import KidsStudentMatrix from "../components/Kids/KidsStudentMatrix";
import KidsStats from "../components/Kids/KidsStats";
import LegalDocuments from "./LegalDocuments";
import { PageHeader, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import api from "../utils/api";

const KidsModule = () => {
    const { hasAnyRole, isCoordinator, isSubCoordinator, isTreasurer } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);
    const [moduleSubCoordinator, setModuleSubCoordinator] = useState(null);
    const [moduleTreasurer, setModuleTreasurer] = useState(null);
    const [loading, setLoading] = useState(false);

    // Load coordinator data on mount and when manually refreshed
    useEffect(() => {
        let cancelled = false;

        const fetchCoordinatorData = async () => {
            setLoading(true);
            try {
                const rolesRes = await api.get("/coordinators/module/kids/roles")
                    .catch(() => ({ data: { coordinator: null, subCoordinator: null, treasurer: null } }));

                if (!cancelled) {
                    setModuleCoordinator(rolesRes.data.coordinator);
                    setModuleSubCoordinator(rolesRes.data.subCoordinator);
                    setModuleTreasurer(rolesRes.data.treasurer);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Error fetching coordinator data:", error);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchCoordinatorData();

        return () => {
            cancelled = true;
        };
    }, [refreshTrigger]);

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const tabs = [
        {
            id: "schedule",
            label: "Cronograma",
            component: (props) => <KidsSchedule {...props} moduleCoordinator={moduleCoordinator} />,
        },
        {
            id: "management",
            label: "Clases y Notas",
            component: KidsCourseManagement,
        },
        {
            id: "matrix",
            label: "Matriz de Estudiantes",
            component: KidsStudentMatrix,
        },
        {
            id: "stats",
            label: "Reporte Estadístico",
            component: KidsStats,
        },
        {
            id: "documents",
            label: "Documentos Legales",
            component: (props) => {
                const canEdit = hasAnyRole([ROLES.ADMIN]) ||
                    isCoordinator('kids') || isSubCoordinator('kids') || isTreasurer('kids');
                return <LegalDocuments {...props} canEdit={canEdit} />;
            },
            customCheck: () => {
                const hasRoleAccess = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR]);
                const isModuleCoord = isCoordinator('kids');
                const isModuleSubCoord = isSubCoordinator('kids');
                const isModuleTreasurer = isTreasurer('kids');
                return hasRoleAccess || isModuleCoord || isModuleSubCoord || isModuleTreasurer;
            },
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Módulo Kids"
                description="Escuela infantil: Kids 1 (5-7), Kids 2 (8 a 10), Teens (11-13) y Jóvenes (14+)"
                action={
                    <div className="flex items-center gap-4">
                        {loading ? (
                            <div
                                role="status"
                                aria-live="polite"
                                aria-label="Cargando coordinadores del módulo"
                                className="flex items-center gap-2 text-sm text-[var(--ln-text-secondary)]"
                            >
                                <Spinner size="sm" color="primary" />
                                <span>Cargando coordinadores…</span>
                            </div>
                        ) : (
                            <CoordinatorDisplay
                                coordinator={moduleCoordinator}
                                subCoordinator={moduleSubCoordinator}
                                treasurer={moduleTreasurer}
                                moduleName="Kids"
                            />
                        )}
                    </div>
                }
            />

            <FloatingRefreshButton
                onClick={handleRefresh}
                label="Actualizar"
                ariaLabel="Actualizar datos del módulo Kids"
            />

            <TabNavigator
                tabs={tabs}
                initialTabId="schedule"
                moduleName="kids"
                componentProps={{ refreshTrigger }}
            />
        </div>
    );
};

export { KidsModule };
export default KidsModule;
