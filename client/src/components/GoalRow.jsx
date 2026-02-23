import { CheckCircle2, XCircle, Clock, Edit2, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';

// Mapeos de colores estáticos para Tailwind
const COLOR_CLASSES = {
    green: {
        bg: 'bg-green-500',
        bgLight: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-500',
        textDark: 'text-green-600 dark:text-green-400',
        border: 'border-green-100 dark:border-green-800/50'
    },
    blue: {
        bg: 'bg-blue-500',
        bgLight: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-500',
        textDark: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-100 dark:border-blue-800/50'
    },
    red: {
        bg: 'bg-red-500',
        bgLight: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-500',
        textDark: 'text-red-600 dark:text-red-400',
        border: 'border-red-100 dark:border-red-800/50'
    }
};

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

    if (isMet) return { label: 'CUMPLIÓ', color: 'green', icon: CheckCircle2 };
    if (isPastDeadline) return { label: 'NO CUMPLIÓ', color: 'red', icon: XCircle };
    return { label: 'EN PROGRESO', color: 'blue', icon: Clock };
};

const getDeadlineText = (goal) => {
    if (goal.encuentro) return new Date(goal.encuentro.startDate).toLocaleDateString();
    if (goal.convention) return new Date(goal.convention.startDate).toLocaleDateString();
    if (goal.month && goal.year) return `${goal.month}/${goal.year}`;
    return 'N/A';
};

const GoalRow = ({ goal, isEditor, onEdit, onDelete }) => {
    const percent = Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100);
    const status = getGoalStatus(goal, percent);
    const StatusIcon = status.icon;
    const colors = COLOR_CLASSES[status.color];

    let goalName = '';
    if (goal.type.includes('CELL')) goalName = goal.type === 'CELL_COUNT' ? 'Meta Células' : 'Asistencia Células';
    else if (goal.encuentro) goalName = `Encuentro: ${goal.encuentro.name}`;
    else if (goal.convention) goalName = `Convención: ${goal.convention.theme}`;

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0">
            <td className="p-4">
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                        {goal.user?.profile?.fullName || 'N/A'}
                    </span>
                    <span className="text-xs text-gray-400">Líder 12</span>
                </div>
            </td>
            <td className="p-4">
                <div className="flex flex-col">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{goalName}</span>
                    <span className="text-xs text-gray-500 capitalize">{goal.type.replace(/_/g, ' ').toLowerCase()}</span>
                </div>
            </td>
            <td className="p-4 text-center">
                <span className="font-black text-gray-900 dark:text-white px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {goal.targetValue}
                </span>
            </td>
            <td className="p-4 text-center">
                <div className="flex flex-col items-center gap-1">
                    <span className="font-bold text-gray-700 dark:text-gray-300">{goal.currentValue}</span>
                    {goal.extraData?.totalPaid !== undefined && (
                        <span className="text-[10px] text-green-600 font-medium">
                            Abonado: ${goal.extraData.totalPaid.toLocaleString()}
                        </span>
                    )}
                </div>
            </td>
            <td className="p-4">
                <div className="w-full max-w-[140px] mx-auto">
                    <div className="flex justify-between mb-1">
                        <span className={`text-xs font-bold ${colors.text}`}>{percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${colors.bg} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                        ></div>
                    </div>
                </div>
            </td>
            <td className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
                {getDeadlineText(goal)}
            </td>
            <td className="p-4">
                <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full ${colors.bgLight} ${colors.textDark} text-xs font-bold ${colors.border} w-fit mx-auto`}>
                    <StatusIcon size={14} />
                    {status.label}
                </div>
            </td>
            {isEditor && (
                <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => onEdit(goal)}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Editar"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => onDelete(goal.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </td>
            )}
        </tr>
    );
};

GoalRow.propTypes = {
    goal: PropTypes.object.isRequired,
    isEditor: PropTypes.bool,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

export default GoalRow;
