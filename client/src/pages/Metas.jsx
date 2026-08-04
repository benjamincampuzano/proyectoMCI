import { useState, useEffect, useMemo } from 'react';
import { 
    Target, Plus, Clock, CheckCircle, XCircle, Pen, Trash, 
    FileText, Calendar
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import GoalForm from '../components/GoalForm';
import GoalRow from '../components/GoalRow';
import ConfirmationModal from '../components/ConfirmationModal';
import { ROLE_GROUPS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Button } from '../components/ui';

// Mapeos de colores estáticos para Tailwind
// Mapeos de colores estáticos para Tailwind actualizados a Linear
const COLOR_CLASSES = {
    green: {
        stroke: 'stroke-emerald-500',
        bg: 'bg-emerald-500',
        bgLight: 'bg-emerald-500/10',
        text: 'text-emerald-500',
        textDark: 'text-emerald-600',
        border: 'border-emerald-500/20',
        gradient: 'from-emerald-500 to-teal-600'
    },
    blue: {
        stroke: 'stroke-[var(--ln-brand-indigo)]',
        bg: 'bg-[var(--ln-brand-indigo)]',
        bgLight: 'bg-[var(--ln-brand-indigo)]/10',
        text: 'text-[var(--ln-brand-indigo)]',
        textDark: 'text-[var(--ln-brand-indigo)]',
        border: 'border-[var(--ln-brand-indigo)]/20',
        gradient: 'from-[var(--ln-brand-indigo)] to-indigo-600'
    },
    red: {
        stroke: 'stroke-red-500',
        bg: 'bg-red-500',
        bgLight: 'bg-red-500/10',
        text: 'text-red-500',
        textDark: 'text-red-600',
        border: 'border-red-500/20',
        gradient: 'from-red-500 to-rose-600'
    },
    amber: {
        stroke: 'stroke-amber-500',
        bg: 'bg-amber-500',
        bgLight: 'bg-amber-500/10',
        text: 'text-amber-500',
        textDark: 'text-amber-600',
        border: 'border-amber-500/20',
        gradient: 'from-amber-500 to-orange-600'
    }
};

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => {
    const colorData = COLOR_CLASSES[color] || COLOR_CLASSES.blue;

    return (
        <div className="relative group px-6 py-5 bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-2xl border border-[var(--ln-border-standard)] hover:border-[var(--ln-border-primary)] transition-all duration-300 shadow-sm overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between relative z-10">
                <div className="flex-1 space-y-1">
                    <p className="text-[11px] weight-590 text-[var(--ln-text-quaternary)] uppercase tracking-[0.05em]">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl weight-590 text-[var(--ln-text-primary)] tracking-tight">{value}</p>
                    </div>
                    {subtitle && (
                        <p className="text-[12px] weight-510 text-[var(--ln-text-tertiary)] opacity-70">{subtitle}</p>
                    )}
                </div>
                <div className={`p-3 ${colorData.bgLight} ${colorData.border} border rounded-xl transition-all group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon size={20} weight="bold" className={colorData.text} />
                </div>
            </div>
            
            {/* Background accent */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${colorData.bg} opacity-[0.03] rounded-full blur-3xl`} />
        </div>
    );
};

const CircularProgress = ({ percentage, size = 120, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

    let colorKey = 'blue';
    if (percentage >= 100) colorKey = 'green';
    else if (percentage < 50) colorKey = 'amber';
    const colorData = COLOR_CLASSES[colorKey];

    return (
        <div className="relative inline-flex items-center justify-center animate-in fade-in duration-1000">
            <svg width={size} height={size} className="transform -rotate-90 filter drop-shadow-sm">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className="stroke-[var(--ln-border-standard)] fill-none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className={`${colorData.stroke} fill-none transition-all duration-1000 ease-out`}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                <span className="text-2xl weight-590 text-[var(--ln-text-primary)] leading-none tracking-tight">{percentage}%</span>
                <span className="text-[9px] weight-700 text-[var(--ln-text-quaternary)] uppercase tracking-widest mt-1">Cumplimiento</span>
            </div>
        </div>
    );
};

const Metas = () => {
    const { hasAnyRole } = useAuth();
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showGoalForm, setShowGoalForm] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, goal: null });

    const isEditor = hasAnyRole(ROLE_GROUPS.CAN_MANAGE_GOALS);

    const handleDelete = async (id) => {
        try {
            await api.delete(`/metas/${id}`);
            await fetchGoals();
        } catch (error) {
            console.error('Error deleting goal:', error);
            toast.error('Error al eliminar la meta');
        }
    };

    const fetchGoals = async () => {
        try {
            setLoading(true);
            const response = await api.get('/metas');
            setGoals(response.data);
        } catch (error) {
            console.error('Error fetching goals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGoals();
    }, []);

    // Calcular estadísticas del dashboard
    const stats = useMemo(() => {
        if (goals.length === 0) {
            return {
                total: 0,
                cumplidas: 0,
                enProgreso: 0,
                noCumplidas: 0,
                porcentajeGeneral: 0,
                promedioCumplimiento: 0
            };
        }

        let cumplidas = 0;
        let noCumplidas = 0;
        let enProgreso = 0;
        let sumaPorcentajes = 0;

        goals.forEach(goal => {
            const percent = Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100);
            sumaPorcentajes += percent;

            let deadline = null;
            if (goal.encuentro) {
                deadline = new Date(goal.encuentro.startDate);
            } else if (goal.convention) {
                deadline = new Date(goal.convention.startDate);
            } else if (goal.month && goal.year) {
                deadline = new Date(goal.year, goal.month, 0);
            }

            const isPastDeadline = deadline && new Date() > deadline;

            if (percent >= 100) {
                cumplidas++;
            } else if (isPastDeadline) {
                noCumplidas++;
            } else {
                enProgreso++;
            }
        });

        return {
            total: goals.length,
            cumplidas,
            enProgreso,
            noCumplidas,
            porcentajeGeneral: Math.round((cumplidas / goals.length) * 100),
            promedioCumplimiento: Math.round(sumaPorcentajes / (goals.length || 1))
        };
    }, [goals]);

    return (
        <div className="space-y-10 pb-32 animate-in fade-in duration-700">
            <PageHeader
                title={<div className="flex items-center gap-4"><Target className="text-[var(--ln-brand-indigo)]" size={32} weight="bold" />Tablero de Metas</div>}
                description="Seguimiento de alta precisión para objetivos ministeriales y cumplimiento de red."
                action={isEditor && (
                    <Button
                        onClick={() => { setEditingGoal(null); setShowGoalForm(true); }}
                        icon={Plus}
                        size="lg"
                        className="shadow-xl shadow-[var(--ln-brand-indigo)]/10"
                    >
                        Nueva Meta
                    </Button>
                )}
            />

            {/* Dashboard de Resumen */}
            {!loading && goals.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <StatCard
                        title="Líderes con Metas"
                        value={stats.total}
                        subtitle="Objetivos activos en red"
                        icon={Target}
                        color="blue"
                    />
                    <StatCard
                        title="Cumplidas"
                        value={stats.cumplidas}
                        subtitle={`${stats.porcentajeGeneral}% de efectividad`}
                        icon={CheckCircle}
                        color="green"
                    />
                    <StatCard
                        title="En Progreso"
                        value={stats.enProgreso}
                        subtitle="Dentro del plazo"
                        icon={Clock}
                        color="amber"
                    />
                    <StatCard
                        title="No Cumplidas"
                        value={stats.noCumplidas}
                        subtitle="Registros vencidos"
                        icon={XCircle}
                        color="red"
                    />
                    <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[24px] border border-[var(--ln-border-standard)] p-6 flex items-center justify-center hover:border-[var(--ln-border-primary)] transition-all duration-300 shadow-sm">
                        <CircularProgress percentage={stats.promedioCumplimiento} size={100} strokeWidth={8} />
                    </div>
                </div>
            )}

            {/* Barra de progreso general */}
            {!loading && goals.length > 0 && (
                <div className="bg-[var(--ln-bg-panel)]/40 backdrop-blur-xl rounded-[32px] border border-[var(--ln-border-standard)] p-10 overflow-hidden relative group">
                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <div>
                            <h3 className="text-xl weight-590 text-[var(--ln-text-primary)] tracking-tight">Efectividad de Cobertura</h3>
                            <p className="text-[13px] weight-510 text-[var(--ln-text-tertiary)] mt-1.5 opacity-70">Relación de metas cumplidas vs. objetivos asignados.</p>
                        </div>
                        <div className="text-right">
                            <span className="text-4xl weight-590 text-[var(--ln-text-primary)] tracking-tighter italic">{stats.porcentajeGeneral}%</span>
                            <p className="text-[11px] weight-700 text-[var(--ln-text-quaternary)] uppercase tracking-widest mt-1">{stats.cumplidas} de {stats.total} líderes</p>
                        </div>
                    </div>
                    
                    <div className="h-2.5 bg-[var(--ln-border-standard)] rounded-full overflow-hidden flex shadow-inner relative z-10">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                            style={{ width: `${(stats.cumplidas / (stats.total || 1)) * 100}%` }}
                        ></div>
                        <div 
                            className="h-full bg-amber-500 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                            style={{ width: `${(stats.enProgreso / (stats.total || 1)) * 100}%` }}
                        ></div>
                        <div 
                            className="h-full bg-red-500 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                            style={{ width: `${(stats.noCumplidas / (stats.total || 1)) * 100}%` }}
                        ></div>
                    </div>

                    <div className="flex items-center justify-center gap-10 mt-10 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                            <span className="text-[11px] weight-590 text-[var(--ln-text-secondary)] uppercase tracking-widest opacity-70">Cumplidas ({stats.cumplidas})</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                            <span className="text-[11px] weight-590 text-[var(--ln-text-secondary)] uppercase tracking-widest opacity-70">En progreso ({stats.enProgreso})</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                            <span className="text-[11px] weight-590 text-[var(--ln-text-secondary)] uppercase tracking-widest opacity-70">No cumplidas ({stats.noCumplidas})</span>
                        </div>
                    </div>

                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--ln-brand-indigo)] opacity-[0.02] blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                </div>
            )}

            {/* Contenedor de Contenido */}
            <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[32px] border border-[var(--ln-border-standard)] overflow-hidden shadow-2xl">
                <div className="px-10 py-8 border-b border-[var(--ln-border-standard)] bg-white/[0.02]">
                    <h3 className="text-lg weight-590 text-[var(--ln-text-primary)] flex items-center gap-3 tracking-tight">
                        <Target size={24} className="text-[var(--ln-brand-indigo)]" weight="bold" />
                        Vista de Objetivos
                    </h3>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-[var(--ln-border-standard)]">
                                <th className="py-6 px-10 text-[10px] weight-700 text-[var(--ln-text-tertiary)] uppercase tracking-[0.1em] opacity-60">Líder Doce</th>
                                <th className="py-6 px-6 text-[10px] weight-700 text-[var(--ln-text-tertiary)] uppercase tracking-[0.1em] opacity-60">Meta / KPI</th>
                                <th className="py-6 px-4 text-[10px] weight-700 text-[var(--ln-text-tertiary)] uppercase tracking-[0.1em] opacity-60 text-center">Objetivo</th>
                                <th className="py-6 px-4 text-[10px] weight-700 text-[var(--ln-text-tertiary)] uppercase tracking-[0.1em] opacity-60 text-center">Actual</th>
                                <th className="py-6 px-4 text-[10px] weight-700 text-[var(--ln-text-tertiary)] uppercase tracking-[0.1em] opacity-60 text-center w-52">Cumplimiento</th>
                                <th className="py-6 px-4 text-[10px] weight-700 text-[var(--ln-text-tertiary)] uppercase tracking-[0.1em] opacity-60 text-center">Fecha Límite</th>
                                <th className="py-6 px-6 text-[10px] weight-700 text-[var(--ln-text-tertiary)] uppercase tracking-[0.1em] opacity-60 text-center">Estado</th>
                                <th className="py-6 px-10 text-[10px] weight-700 text-[var(--ln-text-tertiary)] uppercase tracking-[0.1em] opacity-60 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--ln-border-standard)]/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-32 text-center">
                                        <div className="flex flex-col items-center gap-5">
                                            <div className="w-12 h-12 border-[3px] border-[var(--ln-brand-indigo)]/20 border-t-[var(--ln-brand-indigo)] rounded-full animate-spin"></div>
                                            <p className="text-[13px] weight-510 text-[var(--ln-text-tertiary)]">Cargando datos de rendimiento...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : goals.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-40 text-center">
                                        <div className="w-20 h-20 bg-[var(--ln-bg-panel)] rounded-3xl flex items-center justify-center mx-auto mb-6 border border-[var(--ln-border-standard)] shadow-sm">
                                            <FileText size={32} className="text-[var(--ln-text-quaternary)]" weight="bold" />
                                        </div>
                                        <h3 className="text-xl weight-590 text-[var(--ln-text-primary)]">Sin metas registradas</h3>
                                        <p className="text-[14px] text-[var(--ln-text-tertiary)] opacity-60 mt-2">Inicia creando una nueva meta ministerial.</p>
                                    </td>
                                </tr>
                            ) : (
                                goals.map(goal => (
                                    <GoalRow
                                        key={goal.id}
                                        goal={goal}
                                        onEdit={(g) => { setEditingGoal(g); setShowGoalForm(true); }}
                                        onDelete={handleDelete}
                                        onRequestDelete={(g) => setDeleteConfirm({ isOpen: true, goal: g })}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showGoalForm && (
                <GoalForm
                    isOpen={showGoalForm}
                    onClose={() => setShowGoalForm(false)}
                    onSuccess={() => { fetchGoals(); setShowGoalForm(false); }}
                    initialData={editingGoal}
                />
            )}

            <ConfirmationModal
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, goal: null })}
                onConfirm={() => {
                    if (deleteConfirm.goal) {
                        handleDelete(deleteConfirm.goal.id);
                    }
                    setDeleteConfirm({ isOpen: false, goal: null });
                }}
                title="⚠️ Confirmar Eliminación"
                message="Esta acción es irreversible y eliminará todos los registros históricos asociados a esta meta."
                confirmText="Eliminar Permanentemente"
                variant="danger"
            >
                {deleteConfirm.goal && (
                    <div className="mt-6 space-y-1.5 p-5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-[20px] relative overflow-hidden group/modal-item">
                        <div className="flex justify-between items-center relative z-10">
                            <span className="text-[11px] weight-590 text-[var(--ln-text-quaternary)] uppercase tracking-widest">Meta</span>
                            <span className="text-[13px] weight-590 text-[var(--ln-text-primary)]">
                                {deleteConfirm.goal.type.includes('CELL') 
                                    ? (deleteConfirm.goal.type === 'CELL_COUNT' ? 'Meta Células' : 'Asistencia Células')
                                    : deleteConfirm.goal.encuentro 
                                        ? `Encuentro: ${deleteConfirm.goal.encuentro.name}`
                                        : deleteConfirm.goal.convention 
                                            ? `Convención: ${deleteConfirm.goal.convention.theme}`
                                            : 'Meta'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center relative z-10">
                            <span className="text-[11px] weight-590 text-[var(--ln-text-quaternary)] uppercase tracking-widest">Responsable</span>
                            <span className="text-[13px] weight-590 text-[var(--ln-text-secondary)] opacity-80">{deleteConfirm.goal.user?.profile?.fullName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-[var(--ln-border-standard)] relative z-10">
                            <span className="text-[11px] weight-590 text-[var(--ln-text-quaternary)] uppercase tracking-widest">Objetivo Final</span>
                            <div className="flex items-center gap-2">
                                <Target size={14} className="text-[var(--ln-brand-indigo)]" weight="bold" />
                                <span className="text-[15px] weight-590 text-[var(--ln-brand-indigo)]">{deleteConfirm.goal.targetValue}</span>
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-red-500 opacity-[0.03] blur-3xl rounded-full" />
                    </div>
                )}
            </ConfirmationModal>
        </div>
    );
};

export default Metas;
