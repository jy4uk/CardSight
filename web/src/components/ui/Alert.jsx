import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const variants = {
  success: {
    icon: CheckCircle,
    containerClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    textClass: 'text-emerald-800 dark:text-emerald-200',
  },
  error: {
    icon: AlertCircle,
    containerClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    iconClass: 'text-red-600 dark:text-red-400',
    textClass: 'text-red-800 dark:text-red-200',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    iconClass: 'text-yellow-600 dark:text-yellow-400',
    textClass: 'text-yellow-800 dark:text-yellow-200',
  },
  info: {
    icon: Info,
    containerClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    iconClass: 'text-blue-600 dark:text-blue-400',
    textClass: 'text-blue-800 dark:text-blue-200',
  },
};

export function Alert({
  variant = 'info',
  title,
  children,
  onDismiss,
  className = '',
}) {
  const config = variants[variant] || variants.info;
  const Icon = config.icon;

  return (
    <div className={`border rounded-lg p-4 ${config.containerClass} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconClass}`} />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-medium ${config.textClass}`}>{title}</h4>
          )}
          {children && (
            <div className={`text-sm ${config.textClass} ${title ? 'mt-1' : ''}`}>
              {children}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 ${config.iconClass}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function InlineAlert({ variant = 'error', children, className = '' }) {
  const config = variants[variant] || variants.error;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 ${config.textClass} ${className}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm">{children}</span>
    </div>
  );
}

export default Alert;
