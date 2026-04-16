import React, { useState, useCallback } from 'react';
import { CaretLeft, CaretRight, DotsThree } from '@phosphor-icons/react';
import Typography from './Typography';

/**
 * Pagination Component - Estilo Linear completo
 * Standalone pagination con múltiples variantes y responsive design
 */

const Pagination = ({ 
  currentPage = 1, 
  totalPages = 1, 
  onPageChange, 
  showFirstLast = true, 
  showPrevNext = true, 
  showJump = false, 
  maxVisiblePages = 5, 
  variant = 'default', 
  size = 'default', 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  const [jumpPage, setJumpPage] = useState('');

  // Calcular páginas visibles
  const getVisiblePages = useCallback(() => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    // Ajustar si estamos cerca del final
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages, maxVisiblePages]);

  const visiblePages = getVisiblePages();

  // Manejar cambio de página
  const handlePageChange = useCallback((page) => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange?.(page);
  }, [disabled, totalPages, currentPage, onPageChange]);

  // Manejar jump a página
  const handleJump = useCallback(() => {
    const page = parseInt(jumpPage);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
      setJumpPage('');
    }
  }, [jumpPage, totalPages, handlePageChange]);

  const variantClasses = {
    default: {
      container: 'flex items-center gap-1',
      button: 'px-3 py-2 text-[13px] font-[510] rounded-md transition-all duration-200',
      active: 'bg-[var(--ln-accent-violet)] text-white border-[var(--ln-accent-violet)]',
      inactive: 'bg-[rgba(255,255,255,0.02)] text-[var(--ln-text-secondary)] border border-[rgba(255,255,255,0.08)] hover:text-[var(--ln-text-primary)] hover:border-[rgba(255,255,255,0.12)]',
      disabled: 'opacity-40 cursor-not-allowed'
    },
    pills: {
      container: 'flex items-center gap-2',
      button: 'px-4 py-2 text-[13px] font-[510] rounded-full transition-all duration-200',
      active: 'bg-[var(--ln-accent-violet)] text-white',
      inactive: 'bg-[rgba(255,255,255,0.05)] text-[var(--ln-text-secondary)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--ln-text-primary)]',
      disabled: 'opacity-40 cursor-not-allowed'
    },
    minimal: {
      container: 'flex items-center gap-1',
      button: 'px-2 py-1 text-[12px] font-[510] rounded-sm transition-all duration-200',
      active: 'text-[var(--ln-accent-violet)] border-b-2 border-[var(--ln-accent-violet)]',
      inactive: 'text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)]',
      disabled: 'opacity-40 cursor-not-allowed'
    }
  };

  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-[11px]',
      icon: 'w-3 h-3'
    },
    default: {
      button: 'px-3 py-2 text-[13px]',
      icon: 'w-4 h-4'
    },
    lg: {
      button: 'px-4 py-2.5 text-[14px]',
      icon: 'w-5 h-5'
    }
  };

  const currentVariant = variantClasses[variant];
  const currentSize = sizeClasses[size];

  // Renderizar botón de página
  const renderPageButton = (page, isEllipsis = false) => {
    if (isEllipsis) {
      return (
        <div className={`px-2 py-2 ${currentSize.button} ${currentVariant.disabled}`}>
          <DotsThree className={`${currentSize.icon} text-[var(--ln-text-quaternary)]`} />
        </div>
      );
    }

    const isActive = page === currentPage;
    const buttonClasses = `
      ${currentVariant.button} 
      ${currentSize.button}
      ${isActive ? currentVariant.active : currentVariant.inactive}
      ${disabled ? currentVariant.disabled : 'cursor-pointer'}
    `;

    return (
      <button
        type="button"
        onClick={() => handlePageChange(page)}
        disabled={disabled}
        className={buttonClasses}
        aria-label={`Go to page ${page}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {page}
      </button>
    );
  };

  // Renderizar botones de navegación
  const renderNavButton = (direction, onClick, isDisabled) => {
    const icon = direction === 'prev' ? 
      <CaretLeft className={currentSize.icon} /> : 
      <CaretRight className={currentSize.icon} />;

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isDisabled}
        className={`
          ${currentVariant.button} 
          ${currentSize.button}
          ${isDisabled ? currentVariant.disabled : currentVariant.inactive}
          ${disabled || isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label={`Go to ${direction} page`}
      >
        {icon}
      </button>
    );
  };

  // Generar array con elipsis
  const getPagesWithEllipsis = () => {
    if (visiblePages.length <= maxVisiblePages) {
      return visiblePages;
    }

    const pages = [];
    const firstPage = visiblePages[0];
    const lastPage = visiblePages[visiblePages.length - 1];

    // Agregar primera página
    if (firstPage > 1) {
      pages.push(1);
      if (firstPage > 2) {
        pages.push('ellipsis');
      }
    }

    // Agregar páginas visibles
    pages.push(...visiblePages);

    // Agregar última página
    if (lastPage < totalPages) {
      if (lastPage < totalPages - 1) {
        pages.push('ellipsis');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const pagesWithEllipsis = getPagesWithEllipsis();

  return (
    <div className={`flex items-center justify-between ${className}`} {...props}>
      {/* Info */}
      <div className="flex items-center gap-4">
        <Typography variant="caption" className="text-[var(--ln-text-tertiary)]">
          Página {currentPage} de {totalPages}
        </Typography>

        {/* Jump to page */}
        {showJump && totalPages > 10 && (
          <div className="flex items-center gap-2">
            <Typography variant="caption" className="text-[var(--ln-text-tertiary)]">
              Ir a:
            </Typography>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleJump();
                }
              }}
              className="w-16 px-2 py-1 text-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-accent-violet)]"
              placeholder="1"
            />
            <button
              onClick={handleJump}
              disabled={disabled || !jumpPage}
              className="px-2 py-1 text-[11px] font-[510] bg-[rgba(255,255,255,0.05)] text-[var(--ln-text-secondary)] rounded hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--ln-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Ir
            </button>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className={`flex items-center gap-1 ${currentVariant.container}`}>
        {/* First Page */}
        {showFirstLast && (
          renderNavButton(
            'first',
            () => handlePageChange(1),
            currentPage === 1 || disabled
          )
        )}

        {/* Previous Page */}
        {showPrevNext && (
          renderNavButton(
            'prev',
            () => handlePageChange(currentPage - 1),
            currentPage === 1 || disabled
          )
        )}

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pagesWithEllipsis.map((page, index) => {
            if (page === 'ellipsis') {
              return renderPageButton(null, true);
            }
            return <React.Fragment key={page}>{renderPageButton(page)}</React.Fragment>;
          })}
        </div>

        {/* Next Page */}
        {showPrevNext && (
          renderNavButton(
            'next',
            () => handlePageChange(currentPage + 1),
            currentPage === totalPages || disabled
          )
        )}

        {/* Last Page */}
        {showFirstLast && (
          renderNavButton(
            'last',
            () => handlePageChange(totalPages),
            currentPage === totalPages || disabled
          )
        )}
      </div>
    </div>
  );
};

// Compact Pagination - Para espacios reducidos
export const CompactPagination = ({ 
  currentPage = 1, 
  totalPages = 1, 
  onPageChange, 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`} {...props}>
      <button
        type="button"
        onClick={() => onPageChange?.(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        className="p-1 text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
        aria-label="Previous page"
      >
        <CaretLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1">
        <Typography variant="caption" className="text-[var(--ln-text-tertiary)] font-[510]">
          {currentPage}
        </Typography>
        <Typography variant="caption" className="text-[var(--ln-text-quaternary)]">
          /
        </Typography>
        <Typography variant="caption" className="text-[var(--ln-text-tertiary)] font-[510]">
          {totalPages}
        </Typography>
      </div>

      <button
        type="button"
        onClick={() => onPageChange?.(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        className="p-1 text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
        aria-label="Next page"
      >
        <CaretRight className="w-4 h-4" />
      </button>
    </div>
  );
};

// Load More Pagination - Para infinite scroll
export const LoadMorePagination = ({ 
  hasNextPage = true, 
  isLoading = false, 
  onLoadMore, 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`flex justify-center py-4 ${className}`} {...props}>
      <button
        type="button"
        onClick={onLoadMore}
        disabled={disabled || isLoading || !hasNextPage}
        className="px-6 py-2 text-[13px] font-[510] bg-[rgba(255,255,255,0.02)] text-[var(--ln-text-secondary)] border border-[rgba(255,255,255,0.08)] rounded-md hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--ln-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[var(--ln-accent-violet)] border-t-transparent rounded-full animate-spin" />
            <span>Cargando...</span>
          </div>
        ) : hasNextPage ? (
          'Cargar más'
        ) : (
          'No hay más resultados'
        )}
      </button>
    </div>
  );
};

export default Pagination;

