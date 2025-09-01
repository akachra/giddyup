import React from 'react';
import { useDate } from '@/contexts/DateContext';

interface DateNavigationProps {
  className?: string;
}

export function DateNavigation({ className = "" }: DateNavigationProps) {
  const { selectedDate, navigateDate, formatSelectedDate } = useDate();

  const isAtYesterday = (() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return selectedDate.toDateString() === yesterday.toDateString();
  })();

  return (
    <div className={`flex items-center justify-center space-x-4 ${className}`}>
      <button 
        onClick={() => navigateDate('prev')}
        className="p-2 text-gray-400 hover:text-white transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15,18 9,12 15,6"></polyline>
        </svg>
      </button>
      
      <div className="text-center min-w-[120px]">
        <p className="text-gray-300 text-xs uppercase tracking-wide">{formatSelectedDate(selectedDate)}</p>
        <p className="text-white text-sm font-medium">
          {selectedDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })}
        </p>
      </div>
      
      <button 
        onClick={() => navigateDate('next')}
        disabled={isAtYesterday}
        className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"></polyline>
        </svg>
      </button>
    </div>
  );
}