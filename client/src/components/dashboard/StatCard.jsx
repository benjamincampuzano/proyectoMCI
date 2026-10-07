import PropTypes from 'prop-types';

/**
 * StatCard component styled following Linear design principles (dark-mode-first).
 */
const StatCard = ({
    title,
    value,
    icon: Icon,
    color = 'var(--ln-brand-indigo)',
    subtitle = null,
    trend = null,
    onClick = null,
    className = ''
}) => {
    const isInteractive = Boolean(onClick);

    return (
        <div
            onClick={onClick}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            onKeyDown={isInteractive ? (e) => e.key === 'Enter' && onClick(e) : undefined}
            className={`
                relative overflow-hidden rounded-[20px] p-5
                bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)]
                transition-all duration-300
                hover:border-white/20 hover:shadow-lg hover:-translate-y-0.5
                ${isInteractive ? 'cursor-pointer active:scale-[0.99]' : ''}
                ${className}
            `}
        >
            {/* Background subtle radial glow */}
            <div
                className="pointer-events-none absolute -top-12 -right-12 w-28 h-28 rounded-full opacity-10 blur-xl"
                style={{ backgroundColor: color }}
            />

            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <span className="text-xs sm:text-[13px] weight-510 text-[var(--ln-text-tertiary)] tracking-wide">
                        {title}
                    </span>
                    <div className="text-2xl sm:text-3xl weight-590 text-[var(--ln-text-primary)] tracking-tight">
                        {value ?? '—'}
                    </div>
                </div>

                {Icon && (
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 transition-transform duration-300 group-hover:scale-105"
                        style={{
                            backgroundColor: `${color}18`,
                            color: color
                        }}
                    >
                        <Icon size={20} weight="bold" />
                    </div>
                )}
            </div>

            {(subtitle || trend) && (
                <div className="mt-3.5 pt-3 border-t border-[var(--ln-border-standard)] flex items-center justify-between text-xs text-[var(--ln-text-tertiary)]">
                    {subtitle && <span className="truncate">{subtitle}</span>}
                    {trend && (
                        <span
                            className={`weight-590 inline-flex items-center gap-1 ${
                                trend.positive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                        >
                            {trend.positive ? '+' : ''}{trend.value}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

StatCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    icon: PropTypes.elementType,
    color: PropTypes.string,
    subtitle: PropTypes.string,
    trend: PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        positive: PropTypes.bool
    }),
    onClick: PropTypes.func,
    className: PropTypes.string
};

export default StatCard;
