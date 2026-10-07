import PropTypes from 'prop-types';
import {
    Clock,
    UserPlus,
    CheckCircle,
    Calendar,
    Users,
    GraduationCap,
    Handshake,
    Sparkle
} from '@phosphor-icons/react';

/**
 * Maps entity type or audit action to an icon and color tag
 */
const getActionMeta = (action, entityType) => {
    switch (entityType) {
        case 'GUEST':
            return {
                icon: UserPlus,
                color: '#6366f1',
                bg: 'rgba(99, 102, 241, 0.1)',
                label: 'Invitado'
            };
        case 'CELL':
            return {
                icon: Users,
                color: '#10b981',
                bg: 'rgba(16, 185, 129, 0.1)',
                label: 'Célula'
            };
        case 'CHURCH_ATTENDANCE':
            return {
                icon: Calendar,
                color: '#f59e0b',
                bg: 'rgba(245, 158, 11, 0.1)',
                label: 'Asistencia'
            };
        case 'SEMINAR':
            return {
                icon: GraduationCap,
                color: '#8b5cf6',
                bg: 'rgba(139, 92, 246, 0.1)',
                label: 'Discipulado'
            };
        case 'ENCUENTRO':
        case 'CONVENTION':
            return {
                icon: Handshake,
                color: '#ec4899',
                bg: 'rgba(236, 72, 153, 0.1)',
                label: 'Evento'
            };
        default:
            return {
                icon: Sparkle,
                color: 'var(--ln-brand-indigo)',
                bg: 'rgba(94, 106, 210, 0.1)',
                label: action || 'Registro'
            };
    }
};

const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Hace un momento';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
};

const ActivityFeed = ({
    activities = [],
    isLoading = false,
    emptyMessage = 'No hay actividad registrada recientemente.',
    className = ''
}) => {
    if (isLoading) {
        return (
            <div className={`space-y-3 ${className}`}>
                {[1, 2, 3, 4].map(n => (
                    <div
                        key={n}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-[var(--ln-border-standard)] animate-pulse"
                    >
                        <div className="w-9 h-9 rounded-lg bg-white/5 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <div className="w-1/3 h-3 bg-white/10 rounded" />
                            <div className="w-2/3 h-2.5 bg-white/5 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!activities || activities.length === 0) {
        return (
            <div className={`text-center py-8 text-[var(--ln-text-tertiary)] ${className}`}>
                <Clock size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs sm:text-sm weight-510">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={`divide-y divide-[var(--ln-border-standard)]/50 ${className}`}>
            {activities.map((act) => {
                const meta = getActionMeta(act.action, act.entityType);
                const IconComponent = meta.icon;

                return (
                    <div
                        key={act.id}
                        className="py-3 sm:py-3.5 flex items-start gap-3 transition-colors hover:bg-white/[0.01] -mx-2 px-2 rounded-lg"
                    >
                        <div
                            className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg flex items-center justify-center shrink-0 border border-white/5 mt-0.5"
                            style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                            <IconComponent size={16} weight="bold" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs sm:text-sm weight-590 text-[var(--ln-text-primary)] truncate">
                                    {act.userName || 'Usuario'}
                                </span>
                                <span className="text-[11px] text-[var(--ln-text-tertiary)] shrink-0">
                                    {formatTimeAgo(act.createdAt)}
                                </span>
                            </div>
                            <p className="text-xs text-[var(--ln-text-secondary)] mt-0.5 truncate">
                                {act.details?.description || `${act.action} en ${meta.label}`}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

ActivityFeed.propTypes = {
    activities: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            action: PropTypes.string,
            entityType: PropTypes.string,
            userName: PropTypes.string,
            createdAt: PropTypes.string,
            details: PropTypes.object
        })
    ),
    isLoading: PropTypes.bool,
    emptyMessage: PropTypes.string,
    className: PropTypes.string
};

export default ActivityFeed;
