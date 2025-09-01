import React from 'react';
import { useQuery } from "@tanstack/react-query";

interface WhoopDashboardAIProps {
  recoveryScore: number;
  sleepScore?: number;
  sleepDuration?: number;
  steps?: number;
  strainScore?: number;
  caloriesBurned?: number;
  heartRateVariability?: number | null;
}

interface DailyInsights {
  dailyFocus: string;
  recommendation: string;
}

export function WhoopDashboardAI({ recoveryScore, sleepScore, sleepDuration, steps, strainScore, caloriesBurned, heartRateVariability }: WhoopDashboardAIProps) {
  // Fetch GPT-5 generated daily insights
  const { data: dailyInsights } = useQuery<{insights: DailyInsights}>({
    queryKey: ["/api/ai-coach/daily-insights"],
    refetchInterval: 1000 * 60 * 60 * 2, // Refresh every 2 hours
    staleTime: 0, // Always fetch fresh data
  });

  const getAIMessage = () => {
    const recommendation = dailyInsights?.insights?.recommendation;
    
    // Always prioritize AI insights if we have them and recovery score
    if (recoveryScore > 0 && recommendation) {
      return recommendation;
    }
    
    if (!recoveryScore || recoveryScore === 0) {
      return "Import Health Connect data to get personalized AI coaching and recovery insights.";
    }

    // Fallback with method indicator
    const method = heartRateVariability ? 'HRV method' : 'Proxy method';
    if (recoveryScore >= 90) {
      return `Outstanding ${recoveryScore}% recovery (${method})! Perfect day for high-intensity training.`;
    } else if (recoveryScore >= 75) {
      return `Strong ${recoveryScore}% recovery (${method}). Your body is ready for challenging exercise today.`;
    } else if (recoveryScore >= 60) {
      return `Your ${recoveryScore}% recovery (${method}) suggests moderate training. Listen to your body.`;
    } else if (recoveryScore >= 40) {
      return `Low ${recoveryScore}% recovery (${method}). Consider light activity or rest today.`;
    } else {
      return `Very low ${recoveryScore}% recovery (${method}). Prioritize rest, hydration, and quality sleep.`;
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 22) return "Good evening";
    return "Good night";
  };

  return (
    <div className="space-y-4">
      {/* Time-based greeting with AI coaching */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#252525] rounded-2xl border border-gray-700/50 p-4">
        <h3 className="text-white font-work font-bold text-lg mb-3">
          {getTimeOfDay()}
        </h3>
        <div className="bg-[#2A2A2A] rounded-xl p-4 border border-orange-500/30">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">🔥</span>
            </div>
            <div className="flex-1">
              <div className="text-white text-sm leading-relaxed">
                {getAIMessage()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery & Sleep Card */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#252525] rounded-2xl border border-gray-700/50 p-4">
        <h3 className="text-gray-400 font-work font-medium text-sm mb-3 uppercase tracking-wide">
          Recovery & Sleep
        </h3>
        <div className="bg-[#2A2A2A] rounded-xl p-4 border border-pink-500/30">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">🌸</span>
            </div>
            <div>
              <p className="text-white font-medium mb-2">
                {recoveryScore && sleepScore ? 
                  `Recovery: ${recoveryScore}% (${heartRateVariability ? 'HRV method' : 'Proxy method'}) • Sleep Score: ${sleepScore}% • Sleep: ${sleepDuration ? `${Math.floor(sleepDuration / 60)}h ${sleepDuration % 60}m` : 'N/A'}` :
                  "Import Health Connect data to get personalized recovery insights."
                }
              </p>
              <div className="text-gray-300 text-sm space-y-1">
                {recoveryScore && sleepScore ? (
                  <>
                    <p><strong>Sleep Analysis</strong></p>
                    <p>• {sleepScore < 60 ? `Poor sleep quality (${sleepScore}%)` : sleepScore < 75 ? `Moderate sleep quality (${sleepScore}%)` : `Good sleep quality (${sleepScore}%)`} - aim for 7-9 hours</p>
                    <p>• Recovery is {recoveryScore < 60 ? 'low' : recoveryScore < 75 ? 'moderate' : 'high'} ({recoveryScore}% - {heartRateVariability ? 'HRV method' : 'Proxy method'}) - listen to your body</p>
                  </>
                ) : (
                  <>
                    <p><strong>Available with Data</strong></p>
                    <p>• Recovery score based on HRV and sleep quality</p>
                    <p>• Personalized workout readiness assessment</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Card */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#252525] rounded-2xl border border-gray-700/50 p-4">
        <h3 className="text-gray-400 font-work font-medium text-sm mb-3 uppercase tracking-wide">
          Activity
        </h3>
        <div className="bg-[#2A2A2A] rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">☀️</span>
            </div>
            <div>
              <p className="text-white text-sm leading-relaxed">
                {steps ? 
                  `Steps: ${(steps / 1000).toFixed(1)}k • Calories: ${caloriesBurned || 0} • Activity today` :
                  "Import activity data to get personalized strain targets and fitness guidance."
                }
              </p>
              {steps && (
                <p className="text-gray-300 text-xs mt-2">
                  {steps > 8000 ? 'Good activity level' : steps > 5000 ? 'Moderate activity level' : 'Light activity level'} - {steps.toLocaleString()} steps logged today
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}