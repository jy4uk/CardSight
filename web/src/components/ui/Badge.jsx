import { getConditionColor, getGradeColor, getGameColor } from '../../constants/colors';
import { GAME_LABELS } from '../../constants/cardOptions';

const sizeClasses = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-sm',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  const defaultColor = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  
  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${defaultColor} ${className}`}>
      {children}
    </span>
  );
}

export function ConditionBadge({ condition, size = 'sm', className = '' }) {
  if (!condition) return null;
  
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  const colorClasses = getConditionColor(condition);
  
  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${colorClasses} ${className}`}>
      {condition}
    </span>
  );
}

export function GradeBadge({ cardType, grade, qualifier = '', size = 'sm', className = '' }) {
  if (!cardType || cardType === 'raw') return null;
  
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  const colorClasses = getGradeColor(grade);
  const label = `${cardType.toUpperCase()} ${grade}${qualifier}`;
  
  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${colorClasses} ${className}`}>
      {label}
    </span>
  );
}

export function GameBadge({ game, size = 'sm', className = '' }) {
  if (!game) return null;
  
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  const colorClasses = getGameColor(game);
  const label = GAME_LABELS[game] || game;
  
  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${colorClasses} ${className}`}>
      {label}
    </span>
  );
}

export default Badge;
