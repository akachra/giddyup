import React from 'react';

interface SleepStage {
  stage: 'Awake' | 'REM' | 'Light' | 'Deep';
  duration: number; // in minutes
  color: string;
  percentage: number;
}

interface SleepStagesChartProps {
  stages: SleepStage[];
  totalSleepMinutes: number;
  bedtime: string;
  wakeTime: string;
}

export function SleepStagesChart({ stages, totalSleepMinutes, bedtime, wakeTime }: SleepStagesChartProps) {
  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
      <h3 className="text-white font-work font-semibold text-lg mb-4">Sleep Stages</h3>
      
      {/* Stage bars with timeline */}
      <div className="relative mb-6">
        {/* Timeline labels */}
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>{bedtime}</span>
          <span>{wakeTime}</span>
        </div>
        
        {/* Stage visualization */}
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div key={stage.stage} className="flex items-center">
              <div className="w-12 text-xs text-gray-400 text-right mr-3">
                {stage.stage}
              </div>
              <div className="flex-1 relative">
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: stage.color,
                      width: `${stage.percentage}%`
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Stage legend with durations */}
      <div className="grid grid-cols-2 gap-3">
        {stages.map((stage) => (
          <div key={stage.stage} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-gray-300 text-sm">{stage.stage}</span>
            </div>
            <span className="text-white font-medium text-sm">
              {/* Handle incorrect unit data from Google Fit - cap at 24 hours max */}
              {(() => {
                const minutes = stage.duration;
                // If data is clearly wrong (>24 hours), show as "Invalid"
                if (minutes > 1440) {
                  return "Invalid";
                }
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
              })()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Default sleep stages data matching Whoop's pattern
export const defaultSleepStages: SleepStage[] = [
  {
    stage: 'Awake',
    duration: 15, // 15 minutes
    color: '#FF6B6B',
    percentage: 4
  },
  {
    stage: 'REM',
    duration: 100, // 1h 40m
    color: '#4A9EFF',
    percentage: 27
  },
  {
    stage: 'Light',
    duration: 165, // 2h 45m  
    color: '#00D4FF',
    percentage: 44
  },
  {
    stage: 'Deep',
    duration: 90, // 1h 30m
    color: '#1A1A1A',
    percentage: 25
  }
];