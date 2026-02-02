export function FilterChip({
  children,
  selected = false,
  onClick,
  disabled = false,
  size = 'md',
  className = '',
}) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-sm',
  };

  const baseClasses = 'rounded-full font-medium transition-colors border';
  const selectedClasses = selected
    ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${selectedClasses} ${disabledClasses} ${className}`}
    >
      {children}
    </button>
  );
}

export function FilterChipGroup({
  options,
  value,
  onChange,
  multiple = false,
  size = 'md',
  className = '',
}) {
  const handleClick = (optionValue) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValues);
    } else {
      onChange(value === optionValue ? '' : optionValue);
    }
  };

  const isSelected = (optionValue) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => {
        const optionValue = typeof option === 'object' ? option.id || option.value : option;
        const optionLabel = typeof option === 'object' ? option.label || option.name : option;

        return (
          <FilterChip
            key={optionValue}
            selected={isSelected(optionValue)}
            onClick={() => handleClick(optionValue)}
            size={size}
          >
            {optionLabel}
          </FilterChip>
        );
      })}
    </div>
  );
}

export default FilterChip;
