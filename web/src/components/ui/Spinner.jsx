import { Loader2, RefreshCw } from 'lucide-react';

const sizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export function Spinner({ size = 'md', className = '' }) {
  return (
    <Loader2 className={`animate-spin ${sizes[size]} ${className}`} />
  );
}

export function LoadingSpinner({ size = 'md', label, className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Spinner size={size} className="text-slate-400 dark:text-slate-500" />
      {label && (
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      )}
    </div>
  );
}

export function RefreshSpinner({ size = 'md', className = '' }) {
  return (
    <RefreshCw className={`animate-spin ${sizes[size]} ${className}`} />
  );
}

export function LoadingOverlay({ label = 'Loading...' }) {
  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-10">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}

export default Spinner;
