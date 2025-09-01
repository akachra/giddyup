interface ReadinessRingProps {
  score: number;
  label?: string;
  subtitle?: string;
  color?: string;
  size?: "small" | "large";
}

export default function ReadinessRing({ 
  score, 
  label, 
  subtitle, 
  color = "#10B981",
  size = "large" 
}: ReadinessRingProps) {
  const radius = size === "large" ? 54 : 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const svgSize = size === "large" ? 120 : 40;
  
  const getStatusLabel = (score: number) => {
    if (score >= 75) return label || "READY";
    if (score >= 50) return label || "MODERATE";
    return label || "LOW";
  };

  const getGradientId = () => {
    if (color === "#F59E0B") return "warning-gradient";
    if (color === "#EF4444") return "danger-gradient";
    return "success-gradient";
  };

  return (
    <div className="text-center">
      <div className="relative inline-block">
        <svg className="progress-ring" width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <defs>
            <linearGradient id="success-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981"/>
              <stop offset="100%" stopColor="#00FFE0"/>
            </linearGradient>
            <linearGradient id="warning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B"/>
              <stop offset="100%" stopColor="#D97706"/>
            </linearGradient>
            <linearGradient id="danger-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EF4444"/>
              <stop offset="100%" stopColor="#DC2626"/>
            </linearGradient>
          </defs>
          <circle 
            cx={svgSize/2} 
            cy={svgSize/2} 
            r={radius} 
            stroke="#1A1A1A" 
            strokeWidth={size === "large" ? "12" : "6"} 
            fill="transparent"
          />
          <circle 
            cx={svgSize/2} 
            cy={svgSize/2} 
            r={radius} 
            stroke={`url(#${getGradientId()})`} 
            strokeWidth={size === "large" ? "12" : "6"}
            fill="transparent" 
            strokeLinecap="round"
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset}
            className="progress-ring-circle ring-pulse"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${size === "large" ? "text-3xl" : "text-xs"} font-work font-bold text-white`}>
            {score}
          </span>
          {size === "large" && (
            <span className="text-xs text-gray-400 font-medium">{getStatusLabel(score)}</span>
          )}
        </div>
      </div>
      {subtitle && size === "large" && (
        <p className="text-sm text-gray-300 mt-2">{subtitle}</p>
      )}
    </div>
  );
}
