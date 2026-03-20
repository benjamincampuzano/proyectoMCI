import { useState, useEffect, useMemo } from 'react';
import { Target, Plus, Clock, CheckCircle, XCircle, Pen, Trash, FileText, Minus, SquaresFour, List, Calendar } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import GoalForm from '../components/GoalForm';
import GoalRow from '../components/GoalRow';
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
const COLOR_CLASSES = {
    green: {
        stroke: 'stroke-green-500',
        bg: 'bg-green-500',
        bgLight: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-600 dark:text-green-400',
        textDark: 'text-green-700 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
        gradient: 'from-green-500 to-emerald-600'
    },
    blue: {
        stroke: 'stroke-blue-500',
        bg: 'bg-blue-500',
        bgLight: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        textDark: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        gradient: 'from-blue-500 to-indigo-600'
    },
    red: {
        stroke: 'stroke-red-500',
        bg: 'bg-red-500',
        bgLight: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-600 dark:text-red-400',
        textDark: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
        gradient: 'from-red-500 to-rose-600'
    },
    amber: {
        stroke: 'stroke-amber-500',
        bg: 'bg-amber-500',
        bgLight: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-600 dark:text-amber-400',
        textDark: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
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
        const colorClasses = {
            blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
            green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
            amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
            red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
            purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
        };

        return (
            <div className={`relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-lg hover:scale-[1.02] ${colorClasses[color]}`}>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{title}</p>
                        <p className="text-3xl font-black">{value}</p>
                        {subtitle && (
                            <p className="text-xs mt-1 opacity-60">{subtitle}</p>
                        )}
                    </div>
                    <div className={`p-3 rounded-xl ${colorClasses[color]} bg-opacity-50`}>
                        <Icon size={24} />
                    </div>
                </div>
            </div>
        );
    };

    const CircularProgress = ({ percentage, size = 120, strokeWidth = 10 }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (percentage / 100) * circumference;

        let colorClass = 'stroke-blue-500';
        if (percentage >= 100) colorClass = 'stroke-green-500';
        else if (percentage < 50) colorClass = 'stroke-amber-500';

        return (
            <div className="relative inline-flex items-center justify-center">
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={strokeWidth}
                        className="stroke-gray-200 dark:stroke-gray-700 fill-none"
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={strokeWidth}
                        className={`${colorClass} fill-none transition-all duration-1000 ease-out`}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">{percentage}%</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Cumplimiento</span>
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

    // Componente GroupedGoalCard para la vista de tarjetas agrupadas
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
            <div className="group relative bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                <div className={`h-2 bg-gradient-to-r ${colors.gradient}`}></div>
                
                <div className="p-6">
                    <div className="flex items-start justify-between mb-5">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xl font-black text-gray-900 dark:text-white truncate">{goalName}</h4>
                            <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 mt-1">
                                {group.type.replace(/_/g, ' ')}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-gray-50 dark:bg-gray-800 text-gray-500 border border-gray-100 dark:border-gray-700">
                            {group.leaders.length} {group.leaders.length === 1 ? 'LÍDER' : 'LÍDERES'}
                        </div>
                    </div>

                    <div className="mb-8 p-5 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 relative overflow-hidden">
                        <div className="flex justify-between items-end mb-3">
                            <div>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-tight mb-1">Impacto Grupal</p>
                                <p className="text-3xl font-black text-gray-900 dark:text-white">
                                    {group.currentTotal}<span className="text-sm font-medium text-gray-400 ml-1">/ {group.targetTotal}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`text-4xl font-black italic tracking-tighter ${colors.text}`}>{percent}%</span>
                            </div>
                        </div>
                        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                            <div 
                                className={`h-full ${colors.bg} transition-all duration-1000 ease-out shadow-lg shadow-current/20`}
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Objetivos Individuales</span>
                        </div>
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                            {group.leaders.map(leader => {
                                const leaderPercent = Math.min(Math.round((leader.currentValue / leader.targetValue) * 100), 100);
                                const leaderName = leader.user?.profile?.fullName || 'N/A';
                                return (
                                    <div key={leader.id} className="group/leader flex flex-col gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-md">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-inner uppercase">
                                                    {leaderName.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-gray-800 dark:text-white truncate">{leaderName}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        {leaderPercent >= 100 ? (
                                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[9px] font-black uppercase">
                                                                <CheckCircle size={10} weight="fill" /> Cumplida
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase">
                                                                <Clock size={10} weight="fill" /> En progreso
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-baseline justify-end gap-1">
                                                    <span className="text-xl font-black text-gray-900 dark:text-white">{leader.currentValue}</span>
                                                    <span className="text-[10px] font-bold text-gray-400">/ {leader.targetValue}</span>
                                                </div>
                                                <span className={`text-[12px] font-black ${leaderPercent >= 100 ? 'text-green-500' : 'text-blue-500'}`}>
                                                    {leaderPercent}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ease-out ${leaderPercent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                style={{ width: `${leaderPercent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                            <Clock size={14} className="text-blue-500" />
                            <span>Límite: {getDeadlineText(firstGoal)}</span>
                        </div>
                        <div className="flex gap-1">
                            {isEditor && (
                                <button
                                    onClick={() => { setEditingGoal(firstGoal); setShowGoalForm(true); }}
                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                                    title="Gestionar este grupo"
                                >
                                    <Pen size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto p-4 md:p-8">
            <PageHeader
                title={<div className="flex items-center gap-3"><Target className="text-blue-600" size={32} />Tablero de Metas</div>}
                description="Seguimiento detallado de objetivos y cumplimiento por líder"
                action={isEditor && (
                    <Button
                        onClick={() => { setEditingGoal(null); setShowGoalForm(true); }}
                        icon={Plus}
                        size="lg"
                        className="shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        Nueva Meta
                    </Button>
                )}
            />

            {/* Dashboard de Resumen */}
            {!loading && goals.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard
                        title="Total Líderes con Metas"
                        value={stats.total}
                        subtitle="Objetivos activos"
                        icon={Target}
                        color="blue"
                    />
                    <StatCard
                        title="Cumplidas"
                        value={stats.cumplidas}
                        subtitle={`${stats.porcentajeGeneral}% del total`}
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
                        subtitle="Vencidas sin cumplir"
                        icon={XCircle}
                        color="red"
                    />
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-center justify-center">
                        <CircularProgress percentage={stats.promedioCumplimiento} size={100} strokeWidth={8} />
                    </div>
                </div>
            )}

            {/* Barra de progreso general */}
            {!loading && goals.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Progreso General</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Metas cumplidas sobre el total de líderes</p>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-black text-gray-900 dark:text-white">{stats.porcentajeGeneral}%</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{stats.cumplidas} de {stats.total} líderes</p>
                        </div>
                    </div>
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                        <div 
                            className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-1000 ease-out"
                            style={{ width: `${(stats.cumplidas / (stats.total || 1)) * 100}%` }}
                        ></div>
                        <div 
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-1000 ease-out"
                            style={{ width: `${(stats.enProgreso / (stats.total || 1)) * 100}%` }}
                        ></div>
                        <div 
                            className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-1000 ease-out"
                            style={{ width: `${(stats.noCumplidas / (stats.total || 1)) * 100}%` }}
                        ></div>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4 text-xs font-medium">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500"></div>
                            <span className="text-gray-600 dark:text-gray-400">Cumplidas ({stats.cumplidas})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500"></div>
                            <span className="text-gray-600 dark:text-gray-400">En progreso ({stats.enProgreso})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 to-red-500"></div>
                            <span className="text-gray-600 dark:text-gray-400">No cumplidas ({stats.noCumplidas})</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle de vista y contenido */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {/* Header con toggle */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Target size={20} className="text-blue-500" />
                        Lista de Metas {viewMode === 'cards' && '(Agrupadas por Evento)'}
                    </h3>
                    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'cards' 
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                            title="Vista de tarjetas agrupadas"
                        >
                            <SquaresFour size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'table' 
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                            title="Vista de tabla individual"
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                {/* Contenido según vista */}
                {viewMode === 'cards' ? (
                    // Vista de tarjetas agrupadas
                    <div className="p-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Cargando metas...</p>
                            </div>
                        ) : groupedGoals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="bg-gray-50 dark:bg-gray-800/50 w-20 h-20 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                    <FileText size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sin metas registradas</h3>
                                <p className="text-gray-500 text-sm mt-1">No hay datos para mostrar en este momento.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                                {groupedGoals.map(group => (
                                    <GroupedGoalCard key={group.id} group={group} />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // Vista de tabla
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Líder Doce</th>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Meta / KPI</th>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Objetivo</th>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Actual</th>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center w-40">Cumplimiento</th>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Fecha Límite</th>
                                    <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                                    {isEditor && <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>}
                                </tr>
                            </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={isEditor ? 8 : 7} className="p-10 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                                            <p className="text-sm font-medium">Cargando metas...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : goals.length === 0 ? (
                                <tr>
                                    <td colSpan={isEditor ? 8 : 7} className="p-16 text-center">
                                        <div className="bg-gray-50 dark:bg-gray-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                            <FileText size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sin metas registradas</h3>
                                        <p className="text-gray-500 text-sm mt-1">No hay datos para mostrar en este momento.</p>
                                    </td>
                                </tr>
                            ) : (
                                goals.map(goal => (
                                    <GoalRow
                                        key={goal.id}
                                        goal={goal}
                                        isEditor={isEditor}
                                        onEdit={(g) => { setEditingGoal(g); setShowGoalForm(true); }}
                                        onDelete={handleDelete}
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
        </div>
    );
};

export default Metas;
