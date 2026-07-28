import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import PropTypes from 'prop-types';

/**
 * Pagination - Componente reutilizable responsive
 *
 * Props:
 *   currentPage  - Página actual (1-based)
 *   totalPages   - Total de páginas
 *   totalItems   - Total de items
 *   pageSize     - Items por página
 *   onPageChange - Callback (pageNum) => void
 *   loading      - Deshabilitar interacción
 *   disabled     - Deshabilitar sin spinner
 *   itemLabel    - Texto descriptivo ("invitados", "células", etc.)
 *   variant      - 'default' (panel con borde) | 'inline' (sin borde/fondo)
 *   className    - Clases extra al contenedor externo
 */
const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    pageSize = 10,
    onPageChange,
    loading = false,
    disabled = false,
    itemLabel = 'registros',
    variant = 'default',
    className = '',
}) => {
    if (totalPages <= 1) return null;

    const isDisabled = disabled || loading;
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);

    const getVisiblePages = () => {
        const max = 5;
        if (totalPages <= max) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (currentPage <= 3) {
            return [1, 2, 3, 4, 5];
        }
        if (currentPage >= totalPages - 2) {
            return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
        }
        return Array.from({ length: 5 }, (_, i) => currentPage - 2 + i);
    };

    const visiblePages = getVisiblePages();

    const handlePrev = () => {
        if (!isDisabled && currentPage > 1) onPageChange(currentPage - 1);
    };

    const handleNext = () => {
        if (!isDisabled && currentPage < totalPages) onPageChange(currentPage + 1);
    };

    const handlePage = (page) => {
        if (!isDisabled && page !== currentPage) onPageChange(page);
    };

    const containerClasses = variant === 'default'
        ? `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[var(--ln-bg-panel)] px-3 sm:px-4 py-3 border border-[var(--ln-border-subtle)] rounded-xl ${className}`
        : `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`;

    const navBtnClass = `flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm font-[510] text-[var(--ln-text-secondary)] bg-[var(--ln-btn-ghost)] border border-[var(--ln-border-subtle)] rounded-md hover:bg-[var(--ln-btn-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors`;

    const pageBtnClass = (isActive) =>
        `min-w-[28px] sm:min-w-[32px] h-7 sm:h-8 px-1.5 sm:px-2 text-xs sm:text-sm font-[510] rounded-md transition-colors ${
            isActive
                ? 'bg-[var(--ln-brand-indigo)] text-white shadow-[rgba(94,106,210,0.3)_0px_4px_12px]'
                : 'text-[var(--ln-text-secondary)] bg-[var(--ln-btn-ghost)] border border-[var(--ln-border-subtle)] hover:bg-[var(--ln-btn-subtle)]'
        } disabled:opacity-40 disabled:cursor-not-allowed`;

    return (
        <div className={containerClasses}>
            <div className="text-xs sm:text-sm text-[var(--ln-text-secondary)] text-center sm:text-left">
                {start}-{end} de {totalItems} {itemLabel}
            </div>

            <div className="flex items-center justify-center gap-1 sm:gap-2">
                <button
                    type="button"
                    onClick={handlePrev}
                    disabled={isDisabled || currentPage === 1}
                    className={navBtnClass}
                >
                    <CaretLeft size={14} weight="bold" className="sm:hidden" />
                    <span className="hidden sm:inline">Anterior</span>
                </button>

                <div className="flex items-center gap-0.5 sm:gap-1">
                    {visiblePages.map((page) => (
                        <button
                            key={page}
                            type="button"
                            onClick={() => handlePage(page)}
                            disabled={isDisabled}
                            className={pageBtnClass(currentPage === page)}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={handleNext}
                    disabled={isDisabled || currentPage === totalPages}
                    className={navBtnClass}
                >
                    <CaretRight size={14} weight="bold" className="sm:hidden" />
                    <span className="hidden sm:inline">Siguiente</span>
                </button>
            </div>
        </div>
    );
};

Pagination.propTypes = {
    currentPage: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    totalItems: PropTypes.number,
    pageSize: PropTypes.number,
    onPageChange: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    disabled: PropTypes.bool,
    itemLabel: PropTypes.string,
    variant: PropTypes.oneOf(['default', 'inline']),
    className: PropTypes.string,
};

export default Pagination;
