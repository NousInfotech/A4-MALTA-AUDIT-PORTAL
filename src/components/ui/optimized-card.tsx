import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const OptimizedCard = memo<OptimizedCardProps>(({ 
  children, 
  className, 
  hover = true 
}) => {
  return (
    <div 
      className={cn(
        "bg-white/80 border border-white/50 rounded-2xl p-6 shadow-lg shadow-gray-300/30",
        hover && "hover:bg-white/90",
        className
      )}
    >
      {children}
    </div>
  );
});

OptimizedCard.displayName = 'OptimizedCard';
