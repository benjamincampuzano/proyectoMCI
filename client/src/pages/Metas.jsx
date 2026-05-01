import { useState, useEffect, useMemo } from 'react';
import { 
    Target, Plus, Clock, CheckCircle, XCircle, Pen, Trash, 
    FileText, Minus, SquaresFour, List, Calendar, ArrowUpRight, ArrowDownRight, Users
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import GoalForm from '../components/GoalForm';
import GoalRow from '../components/GoalRow';
import ConfirmationModal from '../components/ConfirmationModal';
import { ROLE_GROUPS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Button } from '../components/ui';

const getGoalStatus = (goal, percent) => {
    const isMet = percent >= 100;
    let deadline = null;

    if (goal.encuentro) {
        deadline = new Date(goal.encuentro.startDate);
    } else if (goal.convention) {
        deadline = new Date(goal.convention.startDate);
    } else if (goal.month && goal.year) {
        deadline = new Date(goal.year, goal.month, 0);
    }

    const isPastDeadline = deadline && new Date() > deadline;

    if (isMet) return { label: 'CUMPLIÓ', color: 'green', icon: CheckCircle };
    if (isPastDeadline) return { label: 'NO CUMPLIÓ', color: 'red', icon: XCircle };
    return { label: 'EN PROGRESO', color: 'blue', icon: Clock };
};

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

const getDeadlineText = (goal) => {
    if (goal.encuentro) return new Date(goal.encuentro.startDate).toLocaleDateString('es-ES');
    if (goal.convention) return new Date(goal.convention.startDate).toLocaleDateString('es-ES');
    if (goal.month && goal.year) return `${goal.month}/${goal.year}`;
    return 'N/A';
};

const getTimeRemaining = (goal) => {
    let deadline = null;
    if (goal.encuentro) deadline = new Date(goal.encuentro.startDate);
    else if (goal.convention) deadline = new Date(goal.convention.startDate);
    else if (goal.month && goal.year) deadline = new Date(goal.year, goal.month, 0);
    
    if (!deadline) return null;
    
    const now = new Date();
    const diff = deadline - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { text: `Venció hace ${Math.abs(days)} días`, urgent: true };
    if (days === 0) return { text: '¡Vence hoy!', urgent: true };
    if (days === 1) return { text: 'Vence mañana', urgent: true };
    if (days <= 7) return { text: `Faltan ${days} días`, urgent: false };
    return { text: `Faltan ${days} días`, urgent: false };
};

const Metas = () => {
    const { hasAnyRole } = useAuth();
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showGoalForm, setShowGoalForm] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [viewMode, setViewMode] = useState('table'); // 'cards' or 'table'
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

    const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => {
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

    // Agrupar metas por contexto (Tipo + Evento/Periodo)
    const groupedGoals = useMemo(() => {
        const groups = {};

        goals.forEach(goal => {
            const contextKey = [
                goal.type,
                goal.encuentroId || '',
                goal.conventionId || '',
                goal.month || '',
                goal.year || ''
            ].join('|');

            if (!groups[contextKey]) {
                groups[contextKey] = {
                    id: contextKey,
                    type: goal.type,
                    encuentro: goal.encuentro,
                    convention: goal.convention,
                    month: goal.month,
                    year: goal.year,
                    leaders: [],
                    targetTotal: 0,
                    currentTotal: 0
                };
            }

            groups[contextKey].leaders.push(goal);
            groups[contextKey].targetTotal += goal.targetValue;
            groups[contextKey].currentTotal += goal.currentValue;
        });

        return Object.values(groups);
    }, [goals]);

    const GroupedGoalCard = ({ group }) => {
        const percent = group.targetTotal > 0 ? Math.min(Math.round((group.currentTotal / group.targetTotal) * 100), 100) : 0;
        const firstGoal = group.leaders[0];
        
        let goalName = '';
        if (group.type === 'CELL_COUNT') goalName = 'Meta Células';
        else if (group.type === 'CELL_ATTENDANCE') goalName = 'Asistencia Células';
        else if (firstGoal.encuentro) goalName = `Encuentro: ${firstGoal.encuentro.name}`;
        else if (firstGoal.convention) goalName = `Convención: ${firstGoal.convention.theme}`;

        let statusColor = 'blue';
        if (percent >= 100) statusColor = 'green';
        else if (percent < 50) statusColor = 'amber';
        const colors = COLOR_CLASSES[statusColor];

        return (
            <div className="group relative bg-[var(--ln-bg-surface)] rounded-[32px] border border-[var(--ln-border-standard)] overflow-hidden hover:border-[var(--ln-border-primary)] transition-all duration-500 hover:shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                <div className={`h-1.5 bg-gradient-to-r ${colors.gradient} opacity-80`}></div>
                
                <div className="p-8">
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xl weight-590 text-[var(--ln-text-primary)] tracking-tight truncate group-hover:text-[var(--ln-brand-indigo)] transition-colors">{goalName}</h4>
                            <p className="text-[10px] weight-700 uppercase tracking-widest text-[var(--ln-text-quaternary)] mt-1.5 flex items-center gap-2">
                                <Target size={12} weight="bold" className={colors.text} />
                                {group.type.replace(/_/g, ' ')}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] weight-700 bg-[var(--ln-bg-panel)] text-[var(--ln-text-secondary)] border border-[var(--ln-border-standard)]">
                            <Users size={12} weight="bold" />
                            {group.leaders.length} {group.leaders.length === 1 ? 'LÍDER' : 'LÍDERES'}
                        </div>
                    </div>

                    <div className="mb-10 p-6 rounded-2xl bg-[var(--ln-bg-panel)]/30 border border-[var(--ln-border-standard)] relative overflow-hidden group/impact">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="text-[10px] weight-700 text-[var(--ln-text-quaternary)] uppercase tracking-[0.05em] mb-1.5">Impacto Grupal</p>
                                <p className="text-3xl weight-590 text-[var(--ln-text-primary)]">
                                    {group.currentTotal}<span className="text-sm weight-510 text-[var(--ln-text-tertiary)] ml-1.5 opacity-40">/ {group.targetTotal}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`text-4xl weight-590 italic tracking-tighter ${colors.text} opacity-90`}>{percent}%</span>
                            </div>
                        </div>
                        <div className="h-2.5 w-full bg-[var(--ln-border-standard)] rounded-full overflow-hidden shadow-sm">
                            <div 
                                className={`h-full ${colors.bg} transition-all duration-1000 ease-out shadow-lg shadow-current/10`}
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] weight-700 uppercase tracking-widest text-[var(--ln-text-quaternary)]">Objetivos Individuales</span>
                        </div>
                        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                            {group.leaders.map(leader => {
                                const leaderPercent = Math.min(Math.round((leader.currentValue / leader.targetValue) * 100), 100);
                                const leaderName = leader.user?.profile?.fullName || 'N/A';
                                return (
                                    <div key={leader.id} className="group/leader flex flex-col gap-3.5 p-5 rounded-2xl bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] hover:border-[var(--ln-brand-indigo)]/30 transition-all hover:bg-[var(--ln-bg-panel)]/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-[var(--ln-brand-indigo)]/10 flex items-center justify-center text-[var(--ln-brand-indigo)] weight-590 text-sm border border-[var(--ln-brand-indigo)]/20 uppercase">
                                                    {leaderName.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[14px] weight-590 text-[var(--ln-text-primary)] truncate tracking-tight">{leaderName}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {leaderPercent >= 100 ? (
                                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[9px] weight-700 uppercase tracking-wider border border-emerald-500/20">
                                                                <CheckCircle size={10} weight="bold" /> Cumplida
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-brand-indigo)] text-[9px] weight-700 uppercase tracking-wider border border-[var(--ln-brand-indigo)]/20">
                                                                <Clock size={10} weight="bold" /> En progreso
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-baseline justify-end gap-1.5">
                                                    <span className="text-xl weight-590 text-[var(--ln-text-primary)]">{leader.currentValue}</span>
                                                    <span className="text-[11px] weight-510 text-[var(--ln-text-tertiary)] opacity-40">/ {leader.targetValue}</span>
                                                </div>
                                                <span className={`text-[12px] weight-700 ${leaderPercent >= 100 ? 'text-emerald-500' : 'text-[var(--ln-brand-indigo)]'}`}>
                                                    {leaderPercent}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full bg-[var(--ln-border-standard)] rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ease-out ${leaderPercent >= 100 ? 'bg-emerald-500' : 'bg-[var(--ln-brand-indigo)]'}`}
                                                style={{ width: `${leaderPercent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between pt-6 border-t border-[var(--ln-border-standard)]">
                        <div className="flex items-center gap-2.5 text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-[0.05em] opacity-70">
                            <Calendar size={14} className={colors.text} weight="bold" />
                            <span>Límite: <span className="text-[var(--ln-text-primary)]">{getDeadlineText(firstGoal)}</span></span>
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => { setEditingGoal(firstGoal); setShowGoalForm(true); }}
                                className="p-2.5 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-brand-indigo)] hover:bg-[var(--ln-brand-indigo)]/5 rounded-xl transition-all border border-transparent hover:border-[var(--ln-brand-indigo)]/20"
                                title="Gestionar este grupo"
                            >
                                <Pen size={16} weight="bold" />
                            </button>
                            <button
                                onClick={() => setDeleteConfirm({ isOpen: true, goal: firstGoal })}
                                className="p-2.5 text-[var(--ln-text-tertiary)] hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                                title="Eliminar este grupo"
                            >
                                <Trash size={16} weight="bold" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

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
                {/* Header con toggle */}
                <div className="flex items-center justify-between px-10 py-8 border-b border-[var(--ln-border-standard)] bg-white/[0.02]">
                    <div>
                        <h3 className="text-lg weight-590 text-[var(--ln-text-primary)] flex items-center gap-3 tracking-tight">
                            <Target size={24} className="text-[var(--ln-brand-indigo)]" weight="bold" />
                            Vista de Objetivos
                        </h3>
                        {viewMode === 'cards' && (
                            <p className="text-[12px] text-[var(--ln-text-tertiary)] mt-1 opacity-60">Agrupados por evento y periodo ministerial.</p>
                        )}
                    </div>
                    
                    <div className="flex items-center p-1.5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-2xl shadow-inner">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 text-[12px] weight-590 ${viewMode === 'cards' 
                                ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg shadow-[var(--ln-brand-indigo)]/20 active:scale-95' 
                                : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'
                            }`}
                        >
                            <SquaresFour size={18} weight="bold" />
                            Tarjetas
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 text-[12px] weight-590 ${viewMode === 'table' 
                                ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg shadow-[var(--ln-brand-indigo)]/20 active:scale-95' 
                                : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'
                            }`}
                        >
                            <List size={18} weight="bold" />
                            Tabla
                        </button>
                    </div>
                </div>

                {/* Contenido según vista */}
                {viewMode === 'cards' ? (
                    <div className="p-10">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 space-y-6">
                                <div className="w-12 h-12 border-[3px] border-[var(--ln-brand-indigo)]/20 border-t-[var(--ln-brand-indigo)] rounded-full animate-spin"></div>
                                <p className="text-[14px] weight-510 text-[var(--ln-text-tertiary)] animate-pulse">Sincronizando metas y registros...</p>
                            </div>
                        ) : groupedGoals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                <div className="w-20 h-20 bg-[var(--ln-bg-panel)] rounded-3xl flex items-center justify-center border border-[var(--ln-border-standard)] mb-2 shadow-sm">
                                    <FileText size={32} className="text-[var(--ln-text-quaternary)]" weight="bold" />
                                </div>
                                <h3 className="text-xl weight-590 text-[var(--ln-text-primary)]">Sin metas registradas</h3>
                                <p className="text-[14px] text-[var(--ln-text-tertiary)] opacity-60">No se han definido objetivos para este periodo aún.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                                {groupedGoals.map(group => (
                                    <GroupedGoalCard key={group.id} group={group} />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
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
                )}
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
