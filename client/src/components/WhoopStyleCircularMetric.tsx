import React from 'react';

interface WhoopStyleCircularMetricProps {
  value: number | string;
  label: string;
  percentage?: number; // 0-100 for progress ring
  color?: 'green' | 'blue' | 'orange' | 'red' | 'yellow' | 'purple';
  size?: 'small' | 'medium' | 'large';
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
}

const colorMap = {
  green: {
    stroke: '#00D570',
    bg: '#00D570/10',
    glow: '#00D570/20'
  },
  blue: {
    stroke: '#4A9EFF', 
    bg: '#4A9EFF/10',
    glow: '#4A9EFF/20'
  },
  orange: {
    stroke: '#FF8C42',
    bg: '#FF8C42/10', 
    glow: '#FF8C42/20'
  },
  red: {
    stroke: '#FF6B6B',
    bg: '#FF6B6B/10',
    glow: '#FF6B6B/20'
  },
  yellow: {
    stroke: '#FFB800',
    bg: '#FFB800/10',
    glow: '#FFB800/20'
  },
  purple: {
    stroke: '#8B5CF6',
    bg: '#8B5CF6/10',
    glow: '#8B5CF6/20'
  }
};

const sizeMap = {
  small: { container: 'w-24 h-24', text: 'text-lg', label: 'text-xs', strokeWidth: 8 },
  medium: { container: 'w-32 h-32', text: 'text-2xl', label: 'text-sm', strokeWidth: 10 },
  large: { container: 'w-40 h-40', text: 'text-3xl', label: 'text-base', strokeWidth: 12 }
};

export function WhoopStyleCircularMetric({ 
  value, 
  label, 
  percentage = 0, 
  color = 'blue', 
  size = 'large',
  subtitle,
  trend
}: WhoopStyleCircularMetricProps) {
  const colors = colorMap[color];
  const sizing = sizeMap[size];
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getTrendIcon = () => {
    if (!trend) return null;
    
    const iconClass = `w-3 h-3 ${color === 'green' ? 'text-green-400' : color === 'red' ? 'text-red-400' : 'text-gray-400'}`;
    
    if (trend === 'up') return (
      <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    );
    
    if (trend === 'down') return (
      <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
    
    return (
      <div className={`w-3 h-1 bg-gray-400 rounded`}></div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${sizing.container} flex items-center justify-center`}>
        {/* Background circle with glow */}
        <div 
          className={`absolute inset-0 rounded-full opacity-20`}
          style={{ 
            backgroundColor: colors.bg,
            boxShadow: `0 0 20px ${colors.glow}`
          }}
        />
        
        {/* Progress ring */}
        {percentage > 0 && (
          <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={colors.stroke}
              strokeWidth={sizing.strokeWidth}
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 6px ${colors.stroke})`,
                opacity: 0.9
              }}
            />
          </svg>
        )}
        
        {/* Content */}
        <div className="relative z-10 text-center">
          <div className={`font-bold text-white ${sizing.text} font-work leading-none`}>
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-400 mt-1">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      
      {/* Label and trend */}
      <div className="flex items-center space-x-1 mt-3">
        <span className={`text-gray-300 font-medium uppercase tracking-wide ${sizing.label}`}>
          {label}
        </span>
        {getTrendIcon()}
      </div>
    </div>
  );
}