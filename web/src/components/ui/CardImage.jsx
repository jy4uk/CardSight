import { useState } from 'react';
import { ImageOff } from 'lucide-react';

export function CardImage({
  src,
  alt = 'Card image',
  size = 'md',
  className = '',
  fallbackClassName = '',
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClasses = {
    xs: 'w-8 h-11',
    sm: 'w-12 h-16',
    md: 'w-16 h-22',
    lg: 'w-24 h-32',
    xl: 'w-32 h-44',
    full: 'w-full aspect-[2.5/3.5]',
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
    full: 'w-12 h-12',
  };

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg ${sizeClasses[size]} ${fallbackClassName}`}
      >
        <ImageOff className={`text-slate-400 dark:text-slate-500 ${iconSizes[size]}`} />
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover rounded-lg ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
}

export default CardImage;
