import { CheckCircle, XCircle, Clock, Pen, Trash, Warning, Calendar, Target } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';

// Mapeos de colores estáticos para Tailwind actualizados a Linear
const COLOR_CLASSES = {
    green: {
        bg: 'bg-emerald-500',
        bgLight: 'bg-emerald-500/10',
        text: 'text-emerald-500',
        textDark: 'text-emerald-600',
        border: 'border-emerald-500/20'
    },
    blue: {
        bg: 'bg-[var(--ln-brand-indigo)]',
        bgLight: 'bg-[var(--ln-brand-indigo)]/10',
        text: 'text-[var(--ln-brand-indigo)]',
        textDark: 'text-[var(--ln-brand-indigo)]',
        border: 'border-[var(--ln-brand-indigo)]/20'
    },
    red: {
        bg: 'bg-red-500',
        bgLight: 'bg-red-500/10',
        text: 'text-red-500',
        textDark: 'text-red-600',
        border: 'border-red-500/20'
    }
};

const calculateGoalStatus = (goal, percent) => {
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

const formatDeadlineText = (goal) => {
    if (goal.encuentro) return new Date(goal.encuentro.startDate).toLocaleDateString();
    if (goal.convention) return new Date(goal.convention.startDate).toLocaleDateString();
    if (goal.month && goal.year) return `${goal.month}/${goal.year}`;
    return 'N/A';
};

const GoalRow = ({ goal, isEditor, onEdit, onDelete }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const percent = Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100);
    const status = calculateGoalStatus(goal, percent);
    const StatusIcon = status.icon;
    const colors = COLOR_CLASSES[status.color];

    let goalName = '';
    if (goal.type.includes('CELL')) goalName = goal.type === 'CELL_COUNT' ? 'Meta Células' : 'Asistencia Células';
    else if (goal.encuentro) goalName = `Encuentro: ${goal.encuentro.name}`;
    else if (goal.convention) goalName = `Convención: ${goal.convention.theme}`;

    return (
        <>
            <tr className="hover:bg-white/[0.02] transition-colors border-b border-[var(--ln-border-standard)]/50 group">
                <td className="py-5 px-10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[var(--ln-brand-indigo)]/10 flex items-center justify-center text-[var(--ln-brand-indigo)] weight-590 text-sm border border-[var(--ln-brand-indigo)]/20 uppercase">
                            {goal.user?.profile?.fullName?.charAt(0) || '?'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[14px] weight-590 text-[var(--ln-text-primary)] tracking-tight">
                                {goal.user?.profile?.fullName || 'N/A'}
                            </span>
                            <span className="text-[10px] weight-700 text-[var(--ln-text-quaternary)] uppercase tracking-widest mt-0.5 opacity-60">Líder Doce</span>
                        </div>
                    </div>
                </td>
                <td className="py-5 px-6">
                    <div className="flex flex-col">
                        <span className="text-[13px] weight-590 text-[var(--ln-text-primary)]">{goalName}</span>
                        <span className="text-[11px] weight-510 text-[var(--ln-text-tertiary)] opacity-60 uppercase tracking-tight mt-0.5">{goal.type.replace(/_/g, ' ').toLowerCase()}</span>
                    </div>
                </td>
                <td className="py-5 px-4 text-center">
                    <span className="inline-block px-3 py-1 bg-[var(--ln-bg-panel)] text-[var(--ln-text-primary)] weight-590 text-[13px] rounded-lg border border-[var(--ln-border-standard)] shadow-sm">
                        {goal.targetValue}
                    </span>
                </td>
                <td className="py-5 px-4 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[15px] weight-590 text-[var(--ln-text-primary)]">{goal.currentValue}</span>
                        {goal.extraData?.totalPaid !== undefined && (
                            <span className="text-[10px] weight-700 text-emerald-500 uppercase tracking-tighter opacity-80">
                                ${goal.extraData.totalPaid.toLocaleString()}
                            </span>
                        )}
                    </div>
                </td>
                <td className="py-5 px-4">
                    <div className="w-full max-w-[180px] mx-auto space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <span className={`text-[11px] weight-700 ${colors.text}`}>{percent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--ln-border-standard)] rounded-full overflow-hidden shadow-inner">
                            <div
                                className={`h-full ${colors.bg} transition-all duration-1000 ease-out shadow-lg shadow-current/10`}
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>
                </td>
                <td className="py-5 px-4 text-center">
                    <div className="inline-flex items-center gap-2 text-[12px] weight-510 text-[var(--ln-text-tertiary)] opacity-70">
                        <Calendar size={14} weight="bold" />
                        {formatDeadlineText(goal)}
                    </div>
                </td>
                <td className="py-5 px-6 text-center">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${colors.bgLight} ${colors.text} text-[10px] weight-700 uppercase tracking-widest border ${colors.border} shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                        <StatusIcon size={12} weight="bold" />
                        {status.label}
                    </div>
                </td>
                {isEditor && (
                    <td className="py-5 px-10 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                            <button
                                onClick={() => onEdit(goal)}
                                className="p-2 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-brand-indigo)] hover:bg-[var(--ln-brand-indigo)]/5 rounded-xl transition-all border border-transparent hover:border-[var(--ln-brand-indigo)]/10"
                                title="Editar"
                            >
                                <Pen size={16} weight="bold" />
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="p-2 text-[var(--ln-text-tertiary)] hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-transparent hover:border-red-500/10"
                                title="Eliminar"
                            >
                                <Trash size={16} weight="bold" />
                            </button>
                        </div>
                    </td>
                )}
            </tr>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => {
                    onDelete(goal.id);
                    setShowDeleteConfirm(false);
                }}
                title="⚠️ Confirmar Eliminación"
                message="Esta acción es irreversible y eliminará todos los registros históricos asociados a esta meta."
                confirmText="Eliminar Permanentemente"
                variant="danger"
            >
                <div className="mt-6 space-y-1.5 p-5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-[20px] relative overflow-hidden group/modal-item">
                    <div className="flex justify-between items-center relative z-10">
                        <span className="text-[11px] weight-590 text-[var(--ln-text-quaternary)] uppercase tracking-widest">Meta</span>
                        <span className="text-[13px] weight-590 text-[var(--ln-text-primary)]">{goalName}</span>
                    </div>
                    <div className="flex justify-between items-center relative z-10">
                        <span className="text-[11px] weight-590 text-[var(--ln-text-quaternary)] uppercase tracking-widest">Responsable</span>
                        <span className="text-[13px] weight-590 text-[var(--ln-text-secondary)] opacity-80">{goal.user?.profile?.fullName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-[var(--ln-border-standard)] relative z-10">
                        <span className="text-[11px] weight-590 text-[var(--ln-text-quaternary)] uppercase tracking-widest">Objetivo Final</span>
                        <div className="flex items-center gap-2">
                            <Target size={14} className="text-[var(--ln-brand-indigo)]" weight="bold" />
                            <span className="text-[15px] weight-590 text-[var(--ln-brand-indigo)]">{goal.targetValue}</span>
                        </div>
                    </div>
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-red-500 opacity-[0.03] blur-3xl rounded-full" />
                </div>
            </ConfirmationModal>
        </>
    );
};

GoalRow.propTypes = {
    goal: PropTypes.object.isRequired,
    isEditor: PropTypes.bool,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

export default GoalRow;
