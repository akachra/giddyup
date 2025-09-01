import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

interface WhoopStyleAICoachingProps {
  message: string;
  recoveryScore?: number;
  heartRateVariability?: number | null;
  stressLevel?: number;
  onClick?: () => void;
}

export function WhoopStyleAICoaching({ message, recoveryScore, heartRateVariability, stressLevel, onClick }: WhoopStyleAICoachingProps) {
  const getRecoveryColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRecoveryEmoji = (score?: number) => {
    if (!score) return '🤖';
    if (score >= 70) return '💪';
    if (score >= 50) return '⚡';
    return '😴';
  };

  const getStressColor = (level?: number) => {
    if (!level) return 'text-gray-400';
    if (level <= 39) return 'text-green-400';
    if (level <= 59) return 'text-yellow-400';
    if (level <= 79) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStressLabel = (level?: number) => {
    if (!level) return 'Unknown';
    if (level <= 39) return 'Low';
    if (level <= 59) return 'Moderate';
    if (level <= 79) return 'High';
    return 'Very High';
  };

  return (
    <div 
      className={`
        bg-gradient-to-r from-[#1A1A1A] to-[#252525] 
        rounded-2xl border border-gray-700/50 p-4 mb-6
        ${onClick ? 'cursor-pointer hover:border-gray-600/50 transition-colors' : ''}
        backdrop-blur-sm
      `}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {/* AI Avatar */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center relative">
            <Bot className="w-5 h-5 text-white" />
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
            </div>
          </div>
        </div>
        
        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">
              AI COACH
            </span>
            {recoveryScore && (
              <span className="text-xs text-gray-500">
                • Recovery: 
                <span className={`font-bold ml-1 ${getRecoveryColor(recoveryScore)}`}>
                  {recoveryScore}% ({heartRateVariability ? 'HRV method' : 'Proxy method'})
                </span>
              </span>
            )}
            {stressLevel && (
              <span className="text-xs text-gray-500">
                • Stress: 
                <span className={`font-bold ml-1 ${getStressColor(stressLevel)}`}>
                  {getStressLabel(stressLevel)} ({stressLevel})
                </span>
              </span>
            )}
          </div>
          
          <div className="flex items-start space-x-2">
            <span className="text-xl" role="img" aria-label="coaching-emoji">
              {getRecoveryEmoji(recoveryScore)}
            </span>
            <p className="text-white text-sm leading-relaxed font-medium">
              {message}
            </p>
          </div>
        </div>
      </div>
      
      {/* Subtle bottom accent */}
      <div className="mt-4 pt-3 border-t border-gray-700/30">
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent rounded"></div>
      </div>
    </div>
  );
}