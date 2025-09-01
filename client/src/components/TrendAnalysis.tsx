import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Eye, Calendar, BarChart3, Target } from 'lucide-react';

interface TrendPoint {
  date: string;
  value: number;
  label?: string;
}

interface Trend {
  name: string;
  data: TrendPoint[];
  current: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'stable';
  interpretation: string;
  color: string;
  icon: React.ReactNode;
}

interface Pattern {
  type: 'improvement' | 'decline' | 'cycle' | 'plateau';
  description: string;
  confidence: number;
  timeframe: string;
  recommendation: string;
}

interface TrendAnalysisProps {
  timeframe: '7d' | '30d' | '90d';
  onTimeframeChange: (timeframe: '7d' | '30d' | '90d') => void;
}

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  timeframe,
  onTimeframeChange
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('recovery');

  // Mock data - in real app would come from API
  const trends: Record<string, Trend> = {
    recovery: {
      name: 'Recovery Score',
      data: [
        { date: '2025-01-01', value: 78 },
        { date: '2025-01-02', value: 82 },
        { date: '2025-01-03', value: 75 },
        { date: '2025-01-04', value: 88 },
        { date: '2025-01-05', value: 91 },
        { date: '2025-01-06', value: 85 }
      ],
      current: 85,
      change: 7,
      changePercent: 8.9,
      direction: 'up',
      interpretation: 'Steady improvement in recovery patterns',
      color: '#10B981',
      icon: <Target className="w-4 h-4" />
    },
    sleep: {
      name: 'Sleep Quality',
      data: [
        { date: '2025-01-01', value: 82 },
        { date: '2025-01-02', value: 85 },
        { date: '2025-01-03', value: 79 },
        { date: '2025-01-04', value: 88 },
        { date: '2025-01-05', value: 86 },
        { date: '2025-01-06', value: 83 }
      ],
      current: 83,
      change: 1,
      changePercent: 1.2,
      direction: 'stable',
      interpretation: 'Consistent sleep quality with minor fluctuations',
      color: '#3B82F6',
      icon: <Calendar className="w-4 h-4" />
    },
    strain: {
      name: 'Daily Strain',
      data: [
        { date: '2025-01-01', value: 14.2 },
        { date: '2025-01-02', value: 16.8 },
        { date: '2025-01-03', value: 12.1 },
        { date: '2025-01-04', value: 18.5 },
        { date: '2025-01-05', value: 15.9 },
        { date: '2025-01-06', value: 13.7 }
      ],
      current: 13.7,
      change: -0.5,
      changePercent: -3.5,
      direction: 'down',
      interpretation: 'Training load has decreased recently',
      color: '#F59E0B',
      icon: <BarChart3 className="w-4 h-4" />
    },
    hrv: {
      name: 'HRV Baseline',
      data: [
        { date: '2025-01-01', value: 42 },
        { date: '2025-01-02', value: 45 },
        { date: '2025-01-03', value: 38 },
        { date: '2025-01-04', value: 48 },
        { date: '2025-01-05', value: 52 },
        { date: '2025-01-06', value: 49 }
      ],
      current: 49,
      change: 7,
      changePercent: 16.7,
      direction: 'up',
      interpretation: 'Heart rate variability showing positive trend',
      color: '#EF4444',
      icon: <TrendingUp className="w-4 h-4" />
    }
  };

  // Detect patterns using AI-like analysis
  const detectPatterns = (trend: Trend): Pattern[] => {
    const data = trend.data;
    const patterns: Pattern[] = [];

    // Calculate moving averages
    const recentAvg = data.slice(-3).reduce((sum, point) => sum + point.value, 0) / 3;
    const previousAvg = data.slice(0, 3).reduce((sum, point) => sum + point.value, 0) / 3;
    
    // Improvement pattern
    if (recentAvg > previousAvg * 1.05) {
      patterns.push({
        type: 'improvement',
        description: `${trend.name} has improved by ${((recentAvg - previousAvg) / previousAvg * 100).toFixed(1)}% over the period`,
        confidence: 85,
        timeframe: timeframe === '7d' ? '7 days' : timeframe === '30d' ? '30 days' : '90 days',
        recommendation: 'Continue current habits to maintain this positive trend'
      });
    }

    // Decline pattern
    if (recentAvg < previousAvg * 0.95) {
      patterns.push({
        type: 'decline',
        description: `${trend.name} has declined by ${((previousAvg - recentAvg) / previousAvg * 100).toFixed(1)}% recently`,
        confidence: 78,
        timeframe: timeframe === '7d' ? '7 days' : timeframe === '30d' ? '30 days' : '90 days',
        recommendation: 'Review recent changes in routine and consider adjustments'
      });
    }

    // Cyclical pattern detection
    const volatility = data.reduce((sum, point, i) => {
      if (i === 0) return sum;
      return sum + Math.abs(point.value - data[i-1].value);
    }, 0) / (data.length - 1);

    if (volatility > (recentAvg * 0.15)) {
      patterns.push({
        type: 'cycle',
        description: `${trend.name} shows cyclical patterns with regular fluctuations`,
        confidence: 72,
        timeframe: timeframe === '7d' ? '7 days' : timeframe === '30d' ? '30 days' : '90 days',
        recommendation: 'Consider tracking external factors that may influence these cycles'
      });
    }

    return patterns;
  };

  const selectedTrend = trends[selectedMetric];
  const patterns = detectPatterns(selectedTrend);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getChangeColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPatternColor = (type: Pattern['type']) => {
    switch (type) {
      case 'improvement': return 'border-green-500/30 bg-green-500/10';
      case 'decline': return 'border-red-500/30 bg-red-500/10';
      case 'cycle': return 'border-blue-500/30 bg-blue-500/10';
      default: return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  return (
    <div className="bg-black text-white p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Eye className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold">Trend Analysis</h2>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeframe === tf
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Selector */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {Object.entries(trends).map(([key, trend]) => (
          <button
            key={key}
            onClick={() => setSelectedMetric(key)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              selectedMetric === key
                ? 'bg-white/10 border border-white/20'
                : 'bg-gray-800/50 hover:bg-gray-700/50 border border-transparent'
            }`}
          >
            {trend.icon}
            <span className="text-sm">{trend.name}</span>
          </button>
        ))}
      </div>

      {/* Current Trend Display */}
      <motion.div
        key={selectedMetric}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold" style={{ color: selectedTrend.color }}>
              {selectedTrend.current}
              {selectedMetric === 'strain' ? '' : '%'}
            </h3>
            <p className="text-gray-400 text-sm">Current {selectedTrend.name}</p>
          </div>
          
          <div className="text-right">
            <div className={`flex items-center space-x-1 ${getChangeColor(selectedTrend.direction)}`}>
              {getTrendIcon(selectedTrend.direction)}
              <span className="font-medium">
                {selectedTrend.change > 0 ? '+' : ''}{selectedTrend.change}
                ({selectedTrend.changePercent > 0 ? '+' : ''}{selectedTrend.changePercent.toFixed(1)}%)
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-1">vs previous period</p>
          </div>
        </div>

        <p className="text-gray-300 text-sm">{selectedTrend.interpretation}</p>
      </motion.div>

      {/* Mini Chart Visualization */}
      <div className="mb-6">
        <div className="h-24 bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-end justify-between h-full">
            {selectedTrend.data.map((point, index) => {
              const maxValue = Math.max(...selectedTrend.data.map(p => p.value));
              const minValue = Math.min(...selectedTrend.data.map(p => p.value));
              const height = ((point.value - minValue) / (maxValue - minValue)) * 100;
              
              return (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="flex-1 mx-1 rounded-t"
                  style={{ backgroundColor: selectedTrend.color }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Detected Patterns */}
      {patterns.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Detected Patterns</h3>
          <div className="space-y-3">
            {patterns.map((pattern, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${getPatternColor(pattern.type)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm capitalize">
                    {pattern.type} Pattern
                  </h4>
                  <span className="text-xs text-gray-400">
                    {pattern.confidence}% confidence
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-2">{pattern.description}</p>
                <p className="text-xs text-gray-400">{pattern.recommendation}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};