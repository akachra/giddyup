import { ReactNode } from "react";
import ReadinessRing from "./ReadinessRing";

interface MetricCardProps {
  title: string;
  icon: ReactNode;
  score: number;
  value: string;
  color: string;
  subtitle?: string;
  onClick?: () => void;
}

export default function MetricCard({ 
  title, 
  icon, 
  score, 
  value, 
  color, 
  subtitle, 
  onClick 
}: MetricCardProps) {
  return (
    <div 
      className="bg-[var(--giddyup-card-bg)] rounded-xl p-4 border border-[var(--giddyup-secondary)]/10 cursor-pointer hover:scale-105 transition-transform"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-work font-medium text-gray-300">{title}</h3>
        {icon}
      </div>
      <div className="flex items-center space-x-3">
        <ReadinessRing score={typeof score === 'number' && score <= 100 ? score : score * 5} color={color} size="small" />
        <div>
          <p className="text-lg font-work font-semibold" style={{ color }}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
