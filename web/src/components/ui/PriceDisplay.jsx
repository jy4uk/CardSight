import { formatPrice } from '../../utils/formatters';

export function PriceDisplay({
  value,
  size = 'md',
  showCents = true,
  prefix = '$',
  className = '',
  labelClassName = '',
}) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  };

  const formattedValue = formatPrice(value, showCents);

  return (
    <span className={`font-semibold text-slate-900 dark:text-slate-100 ${sizeClasses[size]} ${className}`}>
      <span className={labelClassName}>{prefix}</span>
      {formattedValue}
    </span>
  );
}

export function PriceWithLabel({
  label,
  value,
  size = 'md',
  className = '',
}) {
  return (
    <div className={className}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <PriceDisplay value={value} size={size} />
    </div>
  );
}

export function PriceChange({
  value,
  previousValue,
  size = 'sm',
  className = '',
}) {
  const change = (parseFloat(value) || 0) - (parseFloat(previousValue) || 0);
  const isPositive = change >= 0;

  return (
    <span
      className={`font-medium ${
        isPositive
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400'
      } ${className}`}
    >
      {isPositive ? '+' : ''}${formatPrice(change)}
    </span>
  );
}

export default PriceDisplay;
