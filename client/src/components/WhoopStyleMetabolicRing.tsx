import React from 'react';
import { motion } from 'framer-motion';

interface WhoopStyleMetabolicRingProps {
  metabolicAge: number;
  actualAge: number;
  yearsDifference: number;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

export const WhoopStyleMetabolicRing: React.FC<WhoopStyleMetabolicRingProps> = ({
  metabolicAge,
  actualAge,
  yearsDifference,
  size = 'large',
  animated = true
}) => {
  // Calculate progress percentage based on how much younger/older
  // For display purposes, we'll show progress as improvement from actual age
  const maxAgeDifference = 20; // Max years difference for scale
  const progressPercentage = Math.min(100, Math.max(0, 
    ((maxAgeDifference + yearsDifference) / (maxAgeDifference * 2)) * 100
  ));

  const sizeClasses = {
    small: { container: 'w-32 h-32', text: 'text-2xl', subtext: 'text-xs' },
    medium: { container: 'w-48 h-48', text: 'text-4xl', subtext: 'text-sm' },
    large: { container: 'w-64 h-64', text: 'text-5xl', subtext: 'text-base' }
  };

  const { container, text, subtext } = sizeClasses[size];

  // Whoop's signature thick stroke and distinctive colors
  const strokeWidth = size === 'small' ? 6 : size === 'medium' ? 8 : 12;
  const radius = 45 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // Whoop's signature gradient colors
  const getGradientColor = () => {
    if (yearsDifference >= 5) return '#00D4AA'; // Bright Whoop green for great results
    if (yearsDifference >= 2) return '#4ADE80'; // Light green for good results  
    if (yearsDifference >= 0) return '#FBBF24'; // Yellow for neutral
    if (yearsDifference >= -2) return '#FB923C'; // Orange for slight concern
    return '#EF4444'; // Red for concerning results
  };

  const ringColor = getGradientColor();
  
  // Whoop-style background ring
  const backgroundRingOpacity = 0.15;

  return (
    <div className="relative flex items-center justify-center">
      <div className={`relative ${container}`}>
        {/* Background Ring */}
        <svg 
          className="absolute inset-0 w-full h-full transform -rotate-90" 
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={backgroundRingOpacity}
          />
        </svg>

        {/* Animated Progress Ring */}
        <svg 
          className="absolute inset-0 w-full h-full transform -rotate-90" 
          viewBox="0 0 100 100"
        >
          <defs>
            <linearGradient id={`metabolicGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={ringColor} />
              <stop offset="100%" stopColor={ringColor} stopOpacity="0.8" />
            </linearGradient>
          </defs>
          
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            stroke={`url(#metabolicGradient-${size})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: circumference }}
            animate={animated ? { strokeDashoffset } : {}}
            transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1] }}
            filter="drop-shadow(0 0 8px rgba(0, 212, 170, 0.3))"
          />
        </svg>

        {/* Center Content - Whoop Style */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Metabolic Age Label */}
          <motion.div
            initial={animated ? { opacity: 0, y: 10 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-center"
          >
            <p className={`text-gray-400 font-semibold tracking-wider mb-1 ${
              size === 'small' ? 'text-[10px]' : size === 'medium' ? 'text-xs' : 'text-sm'
            }`}>
              METABOLIC AGE
            </p>
            
            {/* Main Age Display */}
            <motion.p
              initial={animated ? { scale: 0.5, opacity: 0 } : {}}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5, type: "spring" }}
              className={`text-white font-bold ${text} leading-none`}
              style={{ fontFamily: 'SF Pro Display, -apple-system, sans-serif' }}
            >
              {metabolicAge}
            </motion.p>

            {/* Years Difference - Whoop Style */}
            <motion.div
              initial={animated ? { opacity: 0, scale: 0.8 } : {}}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, duration: 0.4 }}
              className="flex items-center justify-center space-x-2 mt-2"
            >
              <div className="flex items-center space-x-1">
                <span className={`text-gray-300 ${subtext}`}>{actualAge}</span>
                <span 
                  className={`${subtext} transition-colors`}
                  style={{ color: ringColor }}
                >
                  {yearsDifference >= 0 ? '▼' : '▲'}
                </span>
              </div>
            </motion.div>
            
            <motion.p
              initial={animated ? { opacity: 0 } : {}}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.4 }}
              className={`text-gray-500 ${size === 'small' ? 'text-[10px]' : 'text-xs'} mt-1`}
            >
              ACTUAL AGE
            </motion.p>
          </motion.div>
        </div>

        {/* Whoop-style Performance Indicator */}
        <motion.div
          initial={animated ? { opacity: 0, scale: 0 } : {}}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8, duration: 0.3 }}
          className="absolute -bottom-4 left-1/2 transform -translate-x-1/2"
        >
          <div 
            className="px-3 py-1 rounded-full text-xs font-bold tracking-wide"
            style={{ 
              backgroundColor: `${ringColor}20`,
              color: ringColor,
              border: `1px solid ${ringColor}40`
            }}
          >
            TBD
          </div>
        </motion.div>

        {/* Subtle glow effect */}
        <div 
          className="absolute inset-0 rounded-full opacity-20 blur-xl"
          style={{ 
            background: `radial-gradient(circle, ${ringColor}30 0%, transparent 70%)` 
          }}
        />
      </div>
    </div>
  );
};