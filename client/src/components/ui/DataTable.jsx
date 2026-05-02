import React, { useState, useMemo } from 'react';
import { CaretUp, CaretDown, CaretUpDown } from '@phosphor-icons/react';
import Button from './Button';

/**
 * Data Table Component - Estilo Linear completo
 * Con sorting, pagination, filters, y responsive design
 */

const DataTable = ({
  data = [],
  columns = [],
  pagination = true,
  pageSize = 10,
  sortable = true,
  filterable = false,
  selectable = false,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  className = '',
  onSelectionChange,
  ...props
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [selectedRows, setSelectedRows] = useState(new Set());
  
  // Reset page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filteredData = [...data];

    // Apply filters
    if (filterable && Object.keys(filters).length > 0) {
      filteredData = filteredData.filter(row => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          const cellValue = row[key];
          return String(cellValue).toLowerCase().includes(value.toLowerCase());
        });
      });
    }

    // Apply sorting
    if (sortable && sortConfig.key) {
      filteredData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' 
            ? aValue - bValue
            : bValue - aValue;
        }
        
        return sortConfig.direction === 'asc' 
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    }

    return filteredData;
  }, [data, filters, sortConfig, sortable, filterable]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = pagination 
    ? processedData.slice(startIndex, startIndex + pageSize)
    : processedData;

  // Handle sorting
  const handleSort = (key) => {
    if (!sortable) return;
    
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle filtering
  const handleFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Handle selection
  const handleSelectAll = (checked) => {
    if (checked) {
      const newSelection = new Set(paginatedData.map((_, index) => startIndex + index));
      setSelectedRows(newSelection);
    } else {
      setSelectedRows(new Set());
    }
    onSelectionChange?.(checked ? paginatedData : []);
  };

  const handleSelectRow = (index, checked) => {
    const actualIndex = startIndex + index;
    const newSelection = new Set(selectedRows);
    
    if (checked) {
      newSelection.add(actualIndex);
    } else {
      newSelection.delete(actualIndex);
    }
    
    setSelectedRows(newSelection);
    onSelectionChange?.(paginatedData.filter((_, i) => newSelection.has(startIndex + i)));
  };

  const getSortIcon = (columnKey) => {
    if (!sortable || sortConfig.key !== columnKey) {
      return <CaretUpDown className="w-4 h-4 text-[var(--ln-text-tertiary)]" />;
    }
    return sortConfig.direction === 'asc' 
      ? <CaretUp className="w-4 h-4 text-[var(--ln-accent-violet)]" />
      : <CaretDown className="w-4 h-4 text-[var(--ln-accent-violet)]" />;
  };

  if (loading) {
    return (
      <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--ln-accent-violet)] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden ${className}`} {...props}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.08)]">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={paginatedData.length > 0 && selectedRows.size === paginatedData.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded-sm border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[var(--ln-accent-violet)] focus:ring-[var(--ln-accent-violet)] focus:ring-offset-0"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left ${
                    sortable ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.02)]' : ''
                  } transition-colors duration-200`}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--ln-text-secondary)] uppercase tracking-wider text-[13px] font-[510]">
                      {column.title}
                    </span>
                    {sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Filter Row */}
          {filterable && (
            <thead className="border-b border-[rgba(255,255,255,0.05)]">
              <tr>
                {selectable && <th className="px-4 py-2"></th>}
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-2">
                    {column.filterable && (
                      <input
                        type="text"
                        placeholder={`Filtrar ${column.title.toLowerCase()}...`}
                        value={filters[column.key] || ''}
                        onChange={(e) => handleFilter(column.key, e.target.value)}
                        className="w-full px-2 py-1 text-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded text-[var(--ln-text-secondary)] placeholder:text-[var(--ln-text-tertiary)] focus:outline-none focus:border-[var(--ln-accent-violet)]"
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
          )}

          {/* Body */}
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-8 text-center">
                  <span className="text-[var(--ln-text-tertiary)]">
                    {emptyMessage}
                  </span>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={index}
                  className={`border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-200 ${
                    selectedRows.has(startIndex + index) ? 'bg-[rgba(113,112,255,0.05)]' : ''
                  }`}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(startIndex + index)}
                        onChange={(e) => handleSelectRow(index, e.target.checked)}
                        className="w-4 h-4 rounded-sm border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[var(--ln-accent-violet)] focus:ring-[var(--ln-accent-violet)] focus:ring-offset-0"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      <span className="text-[var(--ln-text-secondary)]">
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </span>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="border-t border-[var(--ln-border-standard)] px-4 py-3 bg-[var(--ln-bg-panel)]">
          <div className="flex items-center justify-between">
            <span className="text-[var(--ln-text-secondary)] text-[13px] font-[510]">
              Mostrando <span className="text-[var(--ln-text-primary)] font-[700]">{startIndex + 1}</span> - <span className="text-[var(--ln-text-primary)] font-[700]">{Math.min(startIndex + pageSize, processedData.length)}</span> de <span className="text-[var(--ln-text-primary)] font-[700]">{processedData.length}</span> resultados
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-[12px] font-[510] text-[var(--ln-text-secondary)] bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-[4px] hover:bg-[var(--ln-border-standard)]/20 hover:text-[var(--ln-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                Anterior
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  const isActive = currentPage === pageNum;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[28px] h-7 px-2 text-[12px] font-[510] rounded-[4px] transition-all duration-200 ${
                        isActive
                          ? 'bg-[var(--ln-brand-indigo)] text-white shadow-md'
                          : 'text-[var(--ln-text-secondary)] bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] hover:bg-[var(--ln-border-standard)]/20 hover:text-[var(--ln-text-primary)]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-[12px] font-[510] text-[var(--ln-text-secondary)] bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-[4px] hover:bg-[var(--ln-border-standard)]/20 hover:text-[var(--ln-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
