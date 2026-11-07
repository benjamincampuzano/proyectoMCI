import PropTypes from 'prop-types';

/**
 * Compact stat card used across the project.
 * Styled following the Linear-inspired design system (works in light and dark mode).
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

    // `color` may be a CSS variable, so we cannot always append an hex alpha.
    const tint = color.startsWith('#')
        ? `${color}18`
        : `color-mix(in srgb, ${color} 12%, transparent)`;

    return (
        <div
            onClick={onClick}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            onKeyDown={isInteractive ? (e) => e.key === 'Enter' && onClick(e) : undefined}
            className={`
                relative overflow-hidden rounded-xl p-3.5 sm:p-4
                bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)]
                transition-all duration-300
                ${isInteractive ? 'cursor-pointer hover:border-[var(--ln-text-primary)]/20 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]' : ''}
                ${className}
            `}
        >
            {/* Subtle radial glow */}
            <div
                className="pointer-events-none absolute -top-8 -right-8 w-20 h-20 rounded-full opacity-10 blur-xl"
                style={{ backgroundColor: color }}
            />

            <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                    <span className="block text-[10px] sm:text-[11px] weight-590 uppercase tracking-wider text-[var(--ln-text-tertiary)] leading-tight truncate">
                        {title}
                    </span>
                    <div className="text-lg sm:text-xl lg:text-2xl weight-590 text-[var(--ln-text-primary)] tracking-tight leading-tight break-words">
                        {value ?? '—'}
                    </div>
                </div>

                {Icon && (
                    <div
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 border border-[var(--ln-border-standard)]"
                        style={{ backgroundColor: tint, color }}
                    >
                        <Icon size={16} weight="bold" />
                    </div>
                )}
            </div>

            {(subtitle || trend) && (
                <div className="relative mt-2.5 pt-2 border-t border-[var(--ln-border-standard)] flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-[var(--ln-text-tertiary)] leading-tight">
                    {subtitle && <span className="truncate">{subtitle}</span>}
                    {trend && (
                        <span
                            className={`weight-590 shrink-0 inline-flex items-center gap-1 ${
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
