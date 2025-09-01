import React from 'react';
import { WhoopStyleCircularMetric } from './WhoopStyleCircularMetric';
import { MiniTrendChart } from './MiniTrendChart';
import { formatWeightInPounds } from '@shared/weightUtils';
import { useQuery } from '@tanstack/react-query';

interface HealthMetric {
  label: string;
  value: string;
  change: string;
  changeType: 'up' | 'down' | 'neutral';
  trendData: number[];
  color: string;
}

interface WhoopHealthMetricsProps {
  period?: '7D' | '30D' | '90D';
  onPeriodChange?: (period: '7D' | '30D' | '90D') => void;
  healthMetrics?: {
    weight?: number;
    heartRateVariability?: number | null;
    bodyFat?: number | null;
    metabolicAge?: number;
  };
}

export function WhoopHealthMetrics({ period = '30D', onPeriodChange, healthMetrics }: WhoopHealthMetricsProps) {
  // Fetch historical health metrics for trend charts
  const { data: historicalMetrics } = useQuery({
    queryKey: ['/api/health-metrics', 30],
    queryFn: () => fetch('/api/health-metrics?days=30').then(res => res.json())
  });

  // Helper function to extract trend data with forward-fill for missing values
  const getTrendData = (metricName: string) => {
    if (!historicalMetrics || !Array.isArray(historicalMetrics)) return [];
    
    // Sort by date ascending and extract last 14 days
    const sortedMetrics = historicalMetrics
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);
    
    if (sortedMetrics.length === 0) return [];
    
    const trendData = [];
    let lastValue = null;
    
    for (const metric of sortedMetrics) {
      let currentValue = null;
      
      // Extract the appropriate metric value
      switch (metricName) {
        case 'weight':
          currentValue = metric.weight;
          break;
        case 'heartRateVariability':
          currentValue = metric.heartRateVariability;
          break;
        case 'bodyFatPercentage':
          currentValue = metric.bodyFatPercentage;
          break;
        case 'metabolicAge':
          currentValue = metric.metabolicAge;
          break;
      }
      
      // Use current value if available, otherwise forward-fill from last known value
      if (currentValue !== null && currentValue !== undefined) {
        lastValue = currentValue;
      }
      
      if (lastValue !== null) {
        trendData.push(lastValue);
      }
    }
    
    return trendData;
  };

  // Calculate trend change for display
  const getTrendChange = (trendData: number[], unit: string = '') => {
    if (trendData.length < 2) return 'No Data';
    
    const current = trendData[trendData.length - 1];
    const previous = trendData[trendData.length - 2];
    const change = current - previous;
    const changeStr = change > 0 ? `▲ +${change.toFixed(1)}${unit}` : `▼ ${change.toFixed(1)}${unit}`;
    
    return changeStr;
  };

  const metrics: HealthMetric[] = [
    {
      label: 'Weight',
      value: healthMetrics?.weight ? formatWeightInPounds(healthMetrics.weight) : 'No Data',
      change: getTrendChange(getTrendData('weight'), ' lb'),
      changeType: 'up',
      trendData: getTrendData('weight'),
      color: '#FFA500'
    },
    {
      label: 'HRV', 
      value: healthMetrics?.heartRateVariability ? `${healthMetrics.heartRateVariability} ms` : 'No Data',
      change: getTrendChange(getTrendData('heartRateVariability'), ' ms'),
      changeType: 'up',
      trendData: getTrendData('heartRateVariability'),
      color: '#00D570'
    },
    {
      label: 'Body Fat',
      value: healthMetrics?.bodyFat ? `${healthMetrics.bodyFat.toFixed(1)}%` : 'No Data',
      change: getTrendChange(getTrendData('bodyFatPercentage'), '%'),
      changeType: 'down',
      trendData: getTrendData('bodyFatPercentage'),
      color: '#4A9EFF'
    },
    {
      label: 'Metabolic Age',
      value: healthMetrics?.metabolicAge ? `${healthMetrics.metabolicAge}` : 'No Data',
      change: getTrendChange(getTrendData('metabolicAge')),
      changeType: 'down',
      trendData: getTrendData('metabolicAge'),
      color: '#00D570'
    }
  ];

  return (
    <div className="bg-black min-h-screen px-4 pt-8 pb-24">
      {/* Period Selector */}
      <div className="flex justify-center mb-8">
        <div className="bg-[#1A1A1A] rounded-xl p-1 flex space-x-1">
          {(['7D', '30D', '90D'] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange?.(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p 
                  ? 'bg-white text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <div 
            key={metric.label}
            className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-work font-bold text-xl mb-1">
                  {metric.label}
                </h3>
                <p className="text-white font-work font-bold text-3xl">
                  {metric.value}
                </p>
              </div>
              
              <div className="text-right">
                <MiniTrendChart 
                  data={metric.trendData}
                  color={metric.color}
                  width={100}
                  height={40}
                />
                <p className={`text-sm font-medium mt-2 ${
                  metric.changeType === 'up' 
                    ? 'text-red-400' 
                    : metric.changeType === 'down' 
                    ? 'text-green-400' 
                    : 'text-gray-400'
                }`}>
                  {metric.change}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 30-Day Summary */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#252525] rounded-2xl border border-gray-700/50 p-4 mt-6">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-400 text-xl">📊</span>
          </div>
          <div>
            <h4 className="text-white font-medium mb-1">30 Days</h4>
            <p className="text-gray-300 text-sm leading-relaxed">
              Over the past 30 days, your HRV improved 8%, while you lost 0.4% body fat. 
              Keep up the great work.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}