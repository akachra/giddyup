import { HealthMetrics } from "@shared/schema";

interface WeeklyProgressRingProps {
  healthMetrics: HealthMetrics[];
}

export default function WeeklyProgressRing({ healthMetrics }: WeeklyProgressRingProps) {
  const getWeekNumber = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime() + (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek) + 1;
  };

  const getDateRange = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${now.getDate()}`;
  };

  const getAverageScore = (metrics: HealthMetrics[], field: keyof HealthMetrics) => {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + (Number(metric[field]) || 0), 0);
    return Math.round(sum / metrics.length);
  };

  // Calculate progress percentages
  const recoveryProgress = getAverageScore(healthMetrics, 'recoveryScore');
  const sleepProgress = getAverageScore(healthMetrics, 'sleepScore');
  const strainProgress = getAverageScore(healthMetrics, 'strainScore') * 5; // Scale strain to 0-100
  const readinessProgress = getAverageScore(healthMetrics, 'readinessScore');

  const rings = [
    { radius: 70, progress: recoveryProgress, color: "#10B981", label: "Recovery" },
    { radius: 58, progress: sleepProgress, color: "#00FFE0", label: "Sleep" },
    { radius: 46, progress: Math.min(strainProgress, 100), color: "#F59E0B", label: "Strain" },
    { radius: 34, progress: readinessProgress, color: "#EF4444", label: "Activity" },
  ];

  return (
    <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-6 border border-[var(--giddyup-secondary)]/10">
      <h3 className="font-work font-semibold text-lg mb-4 text-center">Weekly Progress</h3>
      <div className="relative flex justify-center">
        <svg className="w-40 h-40" viewBox="0 0 160 160">
          {rings.map((ring, index) => {
            const circumference = 2 * Math.PI * ring.radius;
            const strokeDashoffset = circumference - (ring.progress / 100) * circumference;
            
            return (
              <g key={index}>
                {/* Background ring */}
                <circle 
                  cx="80" 
                  cy="80" 
                  r={ring.radius} 
                  stroke="#1A1A1A" 
                  strokeWidth="10" 
                  fill="transparent"
                />
                {/* Progress ring */}
                <circle 
                  cx="80" 
                  cy="80" 
                  r={ring.radius} 
                  stroke={ring.color} 
                  strokeWidth="10"
                  fill="transparent" 
                  strokeLinecap="round" 
                  transform="rotate(-90 80 80)"
                  strokeDasharray={circumference} 
                  strokeDashoffset={strokeDashoffset}
                  className={index === 0 ? "ring-pulse" : ""}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-work font-bold text-white">Week {getWeekNumber()}</span>
          <span className="text-xs text-gray-400">{getDateRange()}</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
        {rings.map((ring, index) => (
          <div key={index} className="text-center">
            <div 
              className="w-3 h-3 rounded-full mx-auto mb-1" 
              style={{ backgroundColor: ring.color }}
            ></div>
            <span className="text-gray-400">{ring.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
