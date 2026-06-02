import React from 'react';
import { cn } from '@/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, error, helperText, options, placeholder, id, ...props },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-gray-700"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          className={cn(
            'flex h-8.5 w-full rounded-sm border border-gray-300 bg-white px-2.5 py-1 text-xs focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {props.children}
        </select>
        {error && <p className="text-xs text-red-650">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
