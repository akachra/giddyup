import React from 'react';
import { LucideIcon } from 'lucide-react';

interface WhoopStyleCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value?: string;
    color?: 'green' | 'red' | 'gray';
  };
  icon?: LucideIcon;
  onClick?: () => void;
  color?: 'green' | 'blue' | 'orange' | 'red' | 'yellow' | 'purple' | 'gray';
  size?: 'small' | 'medium' | 'large';
}

const colorMap = {
  green: 'text-green-400',
  blue: 'text-blue-400', 
  orange: 'text-orange-400',
  red: 'text-red-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
  gray: 'text-gray-400'
};

const sizeMap = {
  small: { 
    container: 'p-3',
    title: 'text-xs',
    value: 'text-lg',
    subtitle: 'text-xs'
  },
  medium: {
    container: 'p-4', 
    title: 'text-sm',
    value: 'text-xl',
    subtitle: 'text-sm'
  },
  large: {
    container: 'p-6',
    title: 'text-base', 
    value: 'text-2xl',
    subtitle: 'text-base'
  }
};

export function WhoopStyleCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  icon: Icon, 
  onClick,
  color = 'gray',
  size = 'medium'
}: WhoopStyleCardProps) {
  const sizing = sizeMap[size];
  const colorClass = colorMap[color];

  const getTrendIcon = () => {
    if (!trend) return null;
    
    const trendColorClass = trend.color ? colorMap[trend.color] : 'text-gray-400';
    
    if (trend.direction === 'up') return (
      <svg className={`w-3 h-3 ${trendColorClass}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    );
    
    if (trend.direction === 'down') return (
      <svg className={`w-3 h-3 ${trendColorClass}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
    
    return (
      <div className={`w-3 h-1 bg-gray-400 rounded`}></div>
    );
  };

  return (
    <div 
      className={`
        bg-[#1A1A1A] rounded-2xl border border-gray-800/50 
        ${sizing.container} 
        ${onClick ? 'cursor-pointer hover:bg-[#222222] transition-colors' : ''}
        backdrop-blur-sm
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`text-gray-400 uppercase tracking-wide font-medium ${sizing.title}`}>
          {title}
        </span>
        {Icon && <Icon className="w-4 h-4 text-gray-500" />}
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className={`font-bold text-white font-work ${sizing.value} leading-none`}>
            {value}
          </div>
          {subtitle && (
            <div className={`text-gray-400 mt-1 ${sizing.subtitle}`}>
              {subtitle}
            </div>
          )}
        </div>
        
        {trend && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            {trend.value && (
              <span className={`text-xs ${trend.color ? colorMap[trend.color] : 'text-gray-400'}`}>
                {trend.value}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}