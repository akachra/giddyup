import React from 'react';

interface MiniTrendChartProps {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}

export function MiniTrendChart({ data, color, height = 24, width = 80 }: MiniTrendChartProps) {
  if (!data || data.length < 2) {
    return <div className="text-gray-500 text-xs">No trend</div>;
  }
  

  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  // Add padding to center the line vertically
  const padding = height * 0.2; // 20% padding on top and bottom
  const chartHeight = height - (padding * 2);
  
  // Generate SVG path with centered positioning
  const pathData = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  
  return (
    <div className="inline-block bg-gray-900/50 rounded-lg p-2">
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={pathData}
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-sm"
        />
      </svg>
    </div>
  );
}