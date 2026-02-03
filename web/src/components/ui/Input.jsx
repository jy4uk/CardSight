import { forwardRef, useId } from 'react';

export const Input = forwardRef(function Input({
  label,
  error,
  prefix,
  suffix,
  icon: Icon,
  className = '',
  containerClassName = '',
  id: providedId,
  required = false,
  inputMode,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  
  // Ensure minimum 44px height for touch targets
  const baseClasses = 'w-full rounded-lg border transition-colors touch-target min-h-[44px]';
  const stateClasses = error
    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10'
    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800';
  const textClasses = 'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500';
  
  const paddingClasses = Icon || prefix
    ? 'pl-9 pr-3 py-2'
    : suffix
    ? 'pl-3 pr-9 py-2'
    : 'px-3 py-2';

  // Combine aria-describedby values
  const describedBy = [
    error ? errorId : null,
    ariaDescribedBy
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName}>
      {label && (
        <label 
          htmlFor={id}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      <div className="relative">
        {(Icon || prefix) && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true">
            {Icon ? <Icon className="w-4 h-4" /> : prefix}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          className={`${baseClasses} ${stateClasses} ${textClasses} ${paddingClasses} ${className}`}
          aria-label={!label ? ariaLabel : undefined}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          aria-required={required}
          inputMode={inputMode}
          required={required}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p 
          id={errorId}
          className="mt-1 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
