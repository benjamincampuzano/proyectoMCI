import React from 'react';

const Table = ({
  data,
  columns,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  className = '',
  headerClassName = '',
  rowClassName = '',
  cellClassName = '',
  striped = true,
  hover = true,
  compact = false,
  ...props
}) => {
  const baseClasses = 'w-full border-collapse';
  const headerBaseClasses = 'bg-[var(--ln-bg-panel)]/50 border-b border-[var(--ln-border-standard)]';
  const rowBaseClasses = 'border-b border-[var(--ln-border-standard)]';
  const cellBaseClasses = 'px-4 py-3.5 text-[13px] text-[var(--ln-text-primary)]';

  const sizeClasses = compact ? 'px-3 py-2.5' : 'px-4 py-4';

  const getRowClasses = (index) => {
    let classes = rowBaseClasses;
    
    if (striped && index % 2 === 1) {
      classes += ' bg-white/[0.01] dark:bg-white/[0.01]';
    }
    
    if (hover) {
      classes += ' hover:bg-white/[0.03] dark:hover:bg-white/[0.03] transition-colors';
    }
    
    return `${classes} ${rowClassName}`;
  };

  const getCellClasses = () => {
    return `${cellBaseClasses} ${sizeClasses} ${cellClassName}`;
  };

  const getHeaderClasses = () => {
    return `${headerBaseClasses} ${sizeClasses} weight-510 text-[var(--ln-text-tertiary)] text-left uppercase text-[11px] tracking-wider ${headerClassName}`;
  };

  if (loading) {
    return (
      <div className="w-full">
        <TableSkeleton rows={5} columns={columns.length} compact={compact} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`text-center py-12 text-[var(--ln-text-tertiary)] bg-[var(--ln-bg-panel)]/30 rounded-xl border border-dashed border-[var(--ln-border-standard)] ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--ln-border-standard)] bg-[var(--ln-bg-surface)]">
      <table className={`${baseClasses} ${className}`} {...props}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={getHeaderClasses()}
                style={column.width ? { width: column.width } : {}}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ln-border-standard)]">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className={getRowClasses(rowIndex)}>
              {columns.map((column, colIndex) => (
                <td key={colIndex} className={getCellClasses()}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TableSkeleton = ({ rows = 5, columns = 4, compact = false }) => {
  const sizeClasses = compact ? 'h-10' : 'h-14';
  
  return (
    <div className="w-full border border-[var(--ln-border-standard)] rounded-xl overflow-hidden bg-[var(--ln-bg-surface)]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[var(--ln-bg-panel)]/50 border-b border-[var(--ln-border-standard)]">
            {Array.from({ length: columns }).map((_, index) => (
              <th
                key={index}
                className={`px-4 py-4 text-left ${compact ? 'px-3 py-3' : ''}`}
              >
                <div className="h-3 bg-[var(--ln-border-standard)] rounded w-16 animate-pulse opacity-50"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr
              key={rowIndex}
              className={`border-b border-[var(--ln-border-standard)] ${rowIndex % 2 === 1 ? 'bg-white/[0.01]' : ''}`}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td
                  key={colIndex}
                  className={`px-4 py-4 ${compact ? 'px-3 py-3' : ''}`}
                >
                  <div className={`h-4 bg-[var(--ln-border-standard)] rounded w-full animate-pulse opacity-30`}></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TableActions = ({ actions, row, className = '' }) => (
  <div className={`flex items-center gap-1.5 ${className}`}>
    {actions.map((action, index) => (
      <button
        key={index}
        onClick={() => action.onClick(row)}
        className={`inline-flex items-center justify-center p-2 rounded-lg transition-all ${
          action.variant === 'primary'
            ? 'text-[var(--ln-brand-indigo)] hover:bg-[var(--ln-brand-indigo)]/10'
            : action.variant === 'danger'
            ? 'text-red-500 hover:bg-red-500/10'
            : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/[0.05]'
        }`}
        title={action.title}
      >
        {action.icon && <action.icon className="w-4 h-4" />}
      </button>
    ))}
  </div>
);

Table.Skeleton = TableSkeleton;
Table.Actions = TableActions;

export default Table;
