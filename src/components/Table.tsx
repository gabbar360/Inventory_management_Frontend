import React from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/utils';

interface Column<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  className?: string;
  emptyMessage?: string;
}

function Table<T extends Record<string, any>>(
  {
    data,
    columns,
    loading,
    sortBy,
    sortOrder,
    onSort,
    emptyMessage = 'No data available',
  }: TableProps<T>
) {
  const handleSort = (key: string, sortable?: boolean) => {
    if (sortable && onSort) {
      onSort(key);
    }
  };

  const getValue = (record: T, key: keyof T | string): any => {
    if (typeof key === 'string' && key.includes('.')) {
      return key.split('.').reduce((obj, k) => obj?.[k], record);
    }
    return record[key as keyof T];
  };

  if (loading) {
    return (
      <div className="animate-pulse p-4 sm:p-6">
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
        <div className="mb-4">
          <Search className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300" strokeWidth={1.5} />
        </div>
        <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
          {emptyMessage}
        </p>
        <p className="text-gray-400 text-xs sm:text-sm">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  const actionsColumn = columns.find(
    (col) =>
      String(col.key).toLowerCase() === 'actions' ||
      String(col.key).toLowerCase() === 'action' ||
      col.title.toLowerCase() === 'actions' ||
      col.title.toLowerCase() === 'action'
  );

  const otherColumns = columns.filter(
    (col) =>
      col !== columns[0] &&
      col !== actionsColumn
  );

  return (
    <div className="w-full">
      {/* Desktop View */}
      <div className="hidden md:block odoo-table-container">
        <table className="odoo-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-3 py-2 text-xs font-semibold text-gray-600 uppercase bg-gray-50 tracking-wider whitespace-nowrap border-b border-gray-200 transition-colors',
                    column.sortable && 'cursor-pointer hover:bg-gray-100',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sticky && 'sticky left-0 z-10 bg-gray-50'
                  )}
                  style={{ width: column.width }}
                  onClick={() =>
                    handleSort(String(column.key), column.sortable)
                  }
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp
                          className={cn(
                            'h-3 w-3',
                            sortBy === column.key && sortOrder === 'asc'
                              ? 'text-primary-600'
                              : 'text-gray-400'
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            'h-3 w-3 -mt-1',
                            sortBy === column.key && sortOrder === 'desc'
                              ? 'text-primary-600'
                              : 'text-gray-400'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {data.map((record, index) => (
              <tr key={index} className="hover:bg-gray-50/70 transition-colors">
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={cn(
                      'px-3 py-1.5 text-xs sm:text-sm text-gray-800 border-b border-gray-100',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.sticky ? 'sticky left-0 z-10 bg-white whitespace-nowrap' : 'whitespace-nowrap'
                    )}
                  >
                    {column.render
                      ? column.render(
                          getValue(record, column.key),
                          record,
                          index
                        )
                      : getValue(record, column.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden mobile-card-list">
        {data.map((record, index) => (
          <div key={index} className="mobile-card">
            {/* Left Accent Bar */}
            <div className="mobile-card-accent" />

            {/* Header Row: Primary Field & Actions */}
            <div className="mobile-card-header">
              <div className="mobile-card-title-section">
                <span className="mobile-card-label">
                  {columns[0].title}
                </span>
                <div className="mobile-card-title-value">
                  {columns[0].render
                    ? columns[0].render(getValue(record, columns[0].key), record, index)
                    : getValue(record, columns[0].key)}
                </div>
              </div>

              {/* Actions on Top Right */}
              {actionsColumn && (
                <div className="mobile-card-actions">
                  {actionsColumn.render
                    ? actionsColumn.render(getValue(record, actionsColumn.key), record, index)
                    : getValue(record, actionsColumn.key)}
                </div>
              )}
            </div>

            {/* Other Fields Grid */}
            {otherColumns.length > 0 && (
              <div className="mobile-card-grid">
                {otherColumns.map((col) => {
                  const val = col.render
                    ? col.render(getValue(record, col.key), record, index)
                    : getValue(record, col.key);

                  return (
                    <div key={String(col.key)} className="mobile-card-grid-item">
                      <span className="mobile-card-item-label">
                        {col.title}
                      </span>
                      <div className="mobile-card-item-value">
                        {val !== undefined && val !== null && val !== '' ? val : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Table;
