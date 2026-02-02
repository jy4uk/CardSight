export function Card({ children, className = '', hover = false, ...props }) {
  const baseClasses = 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700';
  const hoverClasses = hover ? 'hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer' : '';

  return (
    <div className={`${baseClasses} ${hoverClasses} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`p-4 border-b border-slate-200 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`p-4 border-t border-slate-200 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold text-slate-900 dark:text-slate-100 ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-slate-500 dark:text-slate-400 ${className}`}>
      {children}
    </p>
  );
}

export default Card;
