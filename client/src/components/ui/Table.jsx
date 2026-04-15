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
  const headerBaseClasses = 'bg-[#f5f5f7] dark:bg-[#272729] border-b border-[#d1d1d6] dark:border-[#3a3a3c]';
  const rowBaseClasses = 'border-b border-[#d1d1d6] dark:border-[#3a3a3c]';
  const cellBaseClasses = 'px-4 py-3 text-sm text-[#1d1d1f] dark:text-white';

  const sizeClasses = compact ? 'px-3 py-2' : 'px-4 py-3';

  const getRowClasses = (index) => {
    let classes = rowBaseClasses;
    
    if (striped && index % 2 === 1) {
      classes += ' bg-[#f5f5f7]/50 dark:bg-[#272729]/50';
    }
    
    if (hover) {
      classes += ' hover:bg-[#f5f5f7] dark:hover:bg-[#272729] transition-colors';
    }
    
    return `${classes} ${rowClassName}`;
  };

  const getCellClasses = () => {
    return `${cellBaseClasses} ${sizeClasses} ${cellClassName}`;
  };

  const getHeaderClasses = () => {
    return `${headerBaseClasses} ${sizeClasses} font-semibold text-[#1d1d1f] dark:text-white/80 text-left ${headerClassName}`;
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
      <div className={`text-center py-8 text-[#86868b] dark:text-[#98989d] ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg">
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
        <tbody>
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
  const sizeClasses = compact ? 'h-8' : 'h-12';
  
  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f5f5f7] dark:bg-[#272729] border-b border-[#d1d1d6] dark:border-[#3a3a3c]">
              {Array.from({ length: columns }).map((_, index) => (
                <th
                  key={index}
                  className={`px-4 py-3 font-semibold text-[#1d1d1f] dark:text-white/80 text-left ${compact ? 'px-3 py-2' : ''}`}
                >
                  <div className="h-4 bg-[#d1d1d6] dark:bg-[#3a3a3c] rounded w-24 animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr
                key={rowIndex}
                className={`border-b border-[#d1d1d6] dark:border-[#3a3a3c] ${rowIndex % 2 === 1 ? 'bg-[#f5f5f7]/50 dark:bg-[#272729]/50' : ''}`}
              >
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className={`px-4 py-3 text-sm text-[#1d1d1f] dark:text-white ${compact ? 'px-3 py-2' : ''}`}
                  >
                    <div className={`h-4 bg-[#e5e5ea] dark:bg-[#3a3a3c] rounded w-full animate-pulse`}></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TableActions = ({ actions, row, className = '' }) => (
  <div className={`flex items-center gap-1 ${className}`}>
    {actions.map((action, index) => (
      <button
        key={index}
        onClick={() => action.onClick(row)}
        className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors ${
          action.variant === 'primary'
            ? 'text-[#0071e3] hover:bg-[#0071e3]/10'
            : action.variant === 'danger'
            ? 'text-[#ff3b30] hover:bg-[#ff3b30]/10'
            : 'text-[#86868b] hover:bg-[#f5f5f7] dark:hover:bg-[#272729]'
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
