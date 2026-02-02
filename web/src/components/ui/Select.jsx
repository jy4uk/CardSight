import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(function Select({
  label,
  error,
  options = [],
  placeholder = 'Select...',
  className = '',
  containerClassName = '',
  ...props
}, ref) {
  const baseClasses = 'w-full rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 appearance-none cursor-pointer';
  const stateClasses = error
    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10'
    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800';
  const textClasses = 'text-slate-900 dark:text-slate-100';

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={`${baseClasses} ${stateClasses} ${textClasses} pl-3 pr-10 py-2 ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((option) => {
            const value = typeof option === 'object' ? option.id || option.value : option;
            const label = typeof option === 'object' ? option.label || option.name : option;
            return (
              <option key={value} value={value}>
                {label}
              </option>
            );
          })}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

export default Select;
