import { forwardRef } from 'react';

export const Input = forwardRef(function Input({
  label,
  error,
  prefix,
  suffix,
  icon: Icon,
  className = '',
  containerClassName = '',
  ...props
}, ref) {
  const baseClasses = 'w-full rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400';
  const stateClasses = error
    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10'
    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800';
  const textClasses = 'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500';
  
  const paddingClasses = Icon || prefix
    ? 'pl-9 pr-3 py-2'
    : suffix
    ? 'pl-3 pr-9 py-2'
    : 'px-3 py-2';

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {(Icon || prefix) && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            {Icon ? <Icon className="w-4 h-4" /> : prefix}
          </div>
        )}
        <input
          ref={ref}
          className={`${baseClasses} ${stateClasses} ${textClasses} ${paddingClasses} ${className}`}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

export default Input;
