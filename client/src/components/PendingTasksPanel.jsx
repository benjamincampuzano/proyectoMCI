import { useState, useEffect, useRef } from 'react';
import { Bell, WarningCircle } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const PendingTasksPanel = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [tasksData, setTasksData] = useState({
        uncontactedGuestsCount: 0,
        unassignedDisciplesCount: 0,
        unassistedChurchCount: 0,
        unassistedCellCount: 0,
        unfinishedModulesCount: 0
    });
    const [loading, setLoading] = useState(true);
    const { user, hasAnyRole } = useAuth();
    const menuRef = useRef(null);

    const isAuthorized = hasAnyRole(['LIDER_DOCE', 'ADMIN']);

    useEffect(() => {
        if (!isAuthorized) {
            setLoading(false);
            return;
        }

        const fetchTasks = async () => {
            try {
                const res = await api.get('/dashboard-tasks/pending');
                setTasksData(res.data);
            } catch (error) {
                console.error("Error fetching pending tasks:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [isAuthorized]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    if (!isAuthorized) return null;

    const totalTasks = Object.values(tasksData).reduce((a, b) => a + b, 0);

    const tasksList = [
        {
            title: "Invitados sin contactar (0 llamadas, 0 visitas)",
            count: tasksData.uncontactedGuestsCount,
            link: "/ganar",
            color: "text-red-500 bg-red-500/10"
        },
        {
            title: "Discípulos sin asignar a célula",
            count: tasksData.unassignedDisciplesCount,
            link: "/enviar",
            color: "text-orange-500 bg-orange-500/10"
        },
        {
            title: "Discípulos > 1 mes sin asistir a la iglesia",
            count: tasksData.unassistedChurchCount,
            link: "/consolidar",
            color: "text-amber-500 bg-amber-500/10"
        },
        {
            title: "Discípulos > 1 mes sin asistir a la célula",
            count: tasksData.unassistedCellCount,
            link: "/enviar",
            color: "text-amber-500 bg-amber-500/10"
        },
        {
            title: "Discípulos que no han terminado módulos (Discipular)",
            count: tasksData.unfinishedModulesCount,
            link: "/discipular",
            color: "text-yellow-500 bg-yellow-500/10"
        }
    ];

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex items-center justify-center w-[40px] h-[40px] rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all group"
                title="Tareas Pendientes"
            >
                <Bell size={20} className="text-red-500" weight="fill" />
                
                {!loading && totalTasks > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full shadow-sm ring-2 ring-[var(--ln-bg-panel)]">
                        {totalTasks > 99 ? '99+' : totalTasks}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-[var(--ln-bg-surface)]/95 backdrop-blur-xl border border-red-500/20 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-[var(--ln-border-standard)] flex items-center gap-2">
                        <WarningCircle size={20} className="text-red-500" weight="fill" />
                        <div>
                            <p className="text-[14px] weight-590 text-[var(--ln-text-primary)]">Tareas Pendientes</p>
                            <p className="text-[11px] text-[var(--ln-text-tertiary)] mt-0.5">Acciones requeridas ({totalTasks})</p>
                        </div>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto p-2 space-y-1.5">
                        {loading ? (
                            <p className="text-center text-[12px] text-[var(--ln-text-tertiary)] py-4">Cargando tareas...</p>
                        ) : totalTasks === 0 ? (
                            <div className="text-center py-6">
                                <Bell size={32} className="mx-auto text-[var(--ln-text-tertiary)] opacity-50 mb-2" weight="light" />
                                <p className="text-[13px] text-[var(--ln-text-secondary)]">No hay tareas pendientes</p>
                                <p className="text-[11px] text-[var(--ln-text-tertiary)] mt-1">¡Todo está al día!</p>
                            </div>
                        ) : (
                            tasksList.map((task, index) => (
                                <Link
                                    key={index}
                                    to={task.link}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
                                >
                                    <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${task.color}`}>
                                        <span className="text-[12px] font-bold">{task.count > 99 ? '99+' : task.count}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[13px] font-medium text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)] leading-snug">
                                            {task.title}
                                        </p>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingTasksPanel;
