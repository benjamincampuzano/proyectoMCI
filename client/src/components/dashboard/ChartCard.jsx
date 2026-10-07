import PropTypes from 'prop-types';
import { Spinner } from '@phosphor-icons/react';

/**
 * ChartCard wraps Recharts charts with a consistent Linear dark frame,
 * header, action slots, loading states, and empty fallbacks.
 */
const ChartCard = ({
    title,
    subtitle = null,
    action = null,
    children,
    isLoading = false,
    isEmpty = false,
    emptyMessage = 'No hay datos suficientes para generar el gráfico.',
    className = ''
}) => {
    return (
        <div
            className={`
                bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)]
                rounded-[24px] p-5 sm:p-6 transition-all duration-300
                flex flex-col shadow-xl
                ${className}
            `}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h3 className="text-base sm:text-lg weight-590 text-[var(--ln-text-primary)] tracking-tight">
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-xs sm:text-sm text-[var(--ln-text-tertiary)] weight-510 mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>

            <div className="flex-1 min-h-[260px] sm:min-h-[300px] flex items-center justify-center relative">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center text-[var(--ln-text-tertiary)] space-y-3">
                        <Spinner size={28} className="text-[var(--ln-brand-indigo)] animate-spin" />
                        <span className="text-xs weight-510">Cargando métricas...</span>
                    </div>
                ) : isEmpty ? (
                    <div className="text-center px-4 py-8 text-[var(--ln-text-tertiary)]">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 border border-[var(--ln-border-standard)] flex items-center justify-center text-sm opacity-50">
                            📊
                        </div>
                        <p className="text-xs sm:text-sm weight-510 max-w-xs">{emptyMessage}</p>
                    </div>
                ) : (
                    <div className="w-full h-full min-h-[260px] sm:min-h-[300px]">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
};

ChartCard.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    action: PropTypes.node,
    children: PropTypes.node,
    isLoading: PropTypes.bool,
    isEmpty: PropTypes.bool,
    emptyMessage: PropTypes.string,
    className: PropTypes.string
};

export default ChartCard;
