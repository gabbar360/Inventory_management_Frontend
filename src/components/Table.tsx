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
    className,
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  'px-3 sm:px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap',
                  column.sortable && 'cursor-pointer hover:bg-gray-100',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
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
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((record, index) => (
            <tr key={index} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className={cn(
                    'px-3 sm:px-4 lg:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
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
  );
}

export default Table;
