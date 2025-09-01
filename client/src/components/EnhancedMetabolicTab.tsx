import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SpaceMetabolicAge } from './SpaceMetabolicAge';
import { MiniTrendChart } from './MiniTrendChart';

interface EnhancedMetabolicTabProps {
  onNavigate?: (tab: string) => void;
  metabolicPeriod?: 'Week' | 'Month' | '6 Months';
  onPeriodChange?: (period: 'Week' | 'Month' | '6 Months') => void;
  metrics?: any;
}

export function EnhancedMetabolicTab({ onNavigate, metabolicPeriod = 'Week', onPeriodChange, metrics }: EnhancedMetabolicTabProps) {
  const getPeriodDays = () => {
    switch (metabolicPeriod) {
      case 'Week': return 7;
      case 'Month': return 30;
      case '6 Months': return 180;
      default: return 7;
    }
  };

  // Fetch health metrics data
  const { data: healthMetricsData = [] } = useQuery({
    queryKey: ['/api/health-metrics'],
    queryFn: () => fetch('/api/health-metrics').then(res => res.json()),
  });

  // Fetch manual heart rate data 
  const { data: allManualHeartRateData = [], isLoading: isManualLoading } = useQuery({
    queryKey: ['/api/manual-heart-rate'],
    queryFn: () => fetch('/api/manual-heart-rate').then(res => res.json()),
  });

  // Create merged dataset by starting with manual heart rate data (includes Aug 23)
  const createCompleteDataset = () => {
    const days = getPeriodDays();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days); // For 7 days: today-7 includes the past 7 days
    
    // Get all manual heart rate entries within the time period
    const relevantManualData = allManualHeartRateData.filter((entry: any) => {
      const entryDate = new Date(entry.date);
      const entryDateStr = entryDate.toISOString().split('T')[0];
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
      return entryDateStr >= cutoffDateStr;
    });
    
    // Create a map of health metrics by date for easy lookup
    const healthMetricsMap = new Map();
    healthMetricsData.forEach((metric: any) => {
      const date = metric.date.split('T')[0];
      healthMetricsMap.set(date, metric);
    });
    
    // Merge manual heart rate data with health metrics
    const mergedData = relevantManualData.map((manualEntry: any) => {
      const date = manualEntry.date.split('T')[0];
      const healthMetric = healthMetricsMap.get(date);
      
      return {
        // Use health metrics as base if available
        ...healthMetric,
        // Always use manual heart rate data (more reliable)
        date: manualEntry.date,
        heartRateVariability: manualEntry.hrv,
        restingHeartRate: manualEntry.restingHR,
        age: 50
      };
    });
    
    return mergedData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const historicalData = createCompleteDataset();

  // Helper function to get merged data for specific date
  const getMergedDataForDate = (entry: any) => {
    return entry; // Already merged in createCompleteDataset
  };

  // Helper function to get trend data for a specific metric
  const getTrendData = (field: string) => {
    if (field === 'metabolicAge') {
      // For metabolic age, use real-time calculation with merged data
      return historicalData
        .slice(-7) // Get last 7 days regardless of data completeness
        .reverse() // Most recent first  
        .map((metric: any) => {
          const mergedData = getMergedDataForDate(metric);
          const calculatedAge = calculateScientificMetabolicAge(mergedData);
          return calculatedAge || null;
        })
        .filter((age: any) => age !== null); // Only filter after calculation
    }
    
    return historicalData
      .filter((metric: any) => metric[field] !== null && metric[field] !== undefined)
      .reverse() // Most recent first
      .slice(-7) // Last 7 data points
      .map((metric: any) => metric[field]); // Return just the values as numbers
  };

  // Calculate metabolic age using the exact same logic as Dashboard.tsx
  const calculateScientificMetabolicAge = (metrics: any) => {
    if (!metrics) return null;
    
    // Use user's actual age (passed from parent component)
    const baseAge = metrics.age; // Use actual age from parent component
    let metabolicAge = baseAge;
    
    // HRV impact (optimal: 45+)
    if (metrics.heartRateVariability) {
      const hrv = metrics.heartRateVariability;
      if (hrv < 30) {
        metabolicAge += 5;
      } else if (hrv < 40) {
        metabolicAge += 3;
      } else if (hrv < 45) {
        metabolicAge += 1;
      } else if (hrv >= 50) {
        metabolicAge -= 2;
      }
    }
    
    // Recovery score impact (optimal: 75+)
    if (metrics.recoveryScore) {
      const recovery = metrics.recoveryScore;
      if (recovery < 50) {
        metabolicAge += 4;
      } else if (recovery < 65) {
        metabolicAge += 2;
      } else if (recovery >= 80) {
        metabolicAge -= 2;
      }
    }
    
    // Sleep score impact (optimal: 75+) - with fractional adjustments
    if (metrics.sleepScore) {
      const sleep = metrics.sleepScore;
      if (sleep < 40) {
        metabolicAge += 3.25; // 3 years 3 months
      } else if (sleep < 60) {
        metabolicAge += 1.5; // 1 year 6 months
      } else if (sleep >= 80) {
        metabolicAge -= 0.75; // 9 months younger
      }
    }
    
    // VO2 Max impact (optimal for 50yr old: 40+)
    if (metrics.vo2Max) {
      const vo2 = metrics.vo2Max;
      if (vo2 < 30) {
        metabolicAge += 5;
      } else if (vo2 < 35) {
        metabolicAge += 3;
      } else if (vo2 < 40) {
        metabolicAge += 1;
      } else if (vo2 >= 45) {
        metabolicAge -= 3;
      }
    }
    
    // Body fat percentage impact (optimal for men 50yr: 15-20%) - with fractional adjustments
    if (metrics.bodyFatPercentage) {
      const bf = metrics.bodyFatPercentage;
      if (bf > 30) {
        metabolicAge += 4.5; // 4 years 6 months
      } else if (bf > 25) {
        metabolicAge += 2.25; // 2 years 3 months
      } else if (bf < 15) {
        metabolicAge -= 1.75; // 1 year 9 months younger
      }
    }
    
    // Resting heart rate impact (optimal: 50-65)
    if (metrics.restingHeartRate) {
      const rhr = metrics.restingHeartRate;
      if (rhr > 75) {
        metabolicAge += 2;
      } else if (rhr > 65) {
        metabolicAge += 1;
      } else if (rhr < 55) {
        metabolicAge -= 1;
      }
    }
    
    return Math.max(25, Math.min(80, Math.round(metabolicAge)));
  };

  // Select appropriate data based on the time period
  const getPeriodMetrics = () => {
    // For Week period and when loading, use current metrics to prevent flickering
    if (metabolicPeriod === 'Week' && (isManualLoading || historicalData.length === 0)) {
      return metrics;
    }
    
    // For Week period with loaded data, use most recent complete record
    if (metabolicPeriod === 'Week' && historicalData.length > 0) {
      const weekMetrics = historicalData.find((record: any) => 
        record.sleepScore !== null && record.recoveryScore !== null
      ) || historicalData[0];
      return weekMetrics;
    }
    
    // If no historical data available for other periods, fallback to metrics
    if (historicalData.length === 0) {
      return metrics;
    }
    
    switch (metabolicPeriod) {        
      case 'Month':
        // Use data from the middle of the month period (around index 15 for 30 days)
        const monthIndex = Math.floor(historicalData.length * 0.5);
        return historicalData[monthIndex] || historicalData[0];
        
      case '6 Months':
        // Use older data to show longer-term trends (around index 90 for 180 days)
        const sixMonthIndex = Math.floor(historicalData.length * 0.8);
        return historicalData[sixMonthIndex] || historicalData[historicalData.length - 1] || historicalData[0];
        
      default:
        return historicalData[0];
    }
  };

  const periodMetrics = getPeriodMetrics();
  const combinedMetrics = {
    ...periodMetrics,
    age: metrics?.age || 50, // Always use age from fallback metrics since historical data doesn't include it
  };
  
  const calculatedMetabolicAge = calculateScientificMetabolicAge(combinedMetrics);
  const actualAge = combinedMetrics?.age || 50;

  const getPeriodMessage = () => {
    switch (metabolicPeriod) {
      case 'Week':
        return 'Weekly metabolic analysis and trends';
      case 'Month':
        return 'Monthly metabolic progress and improvements';
      case '6 Months':
        return 'Long-term metabolic health trajectory over 6 months';
      default:
        return 'Import comprehensive health data to analyze metabolic age trends';
    }
  };

  const getPeriodSubtitle = () => {
    const dataCount = historicalData.length;
    switch (metabolicPeriod) {
      case 'Week':
        return `Tracking ${dataCount} days of metabolic data`;
      case 'Month':
        return `Analyzing ${dataCount} days of body composition trends`;
      case '6 Months':
        return `Long-term analysis across ${dataCount} days of health data`;
      default:
        return 'and track improvements over time';
    }
  };

  return (
    <div className="bg-black min-h-screen px-4 pt-8 pb-24">
      {/* Time Period Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-[#1A1A1A] rounded-full p-1 flex">
          <button 
            onClick={() => onPeriodChange?.('Week')}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${metabolicPeriod === 'Week' ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white'}`}
          >
            Week
          </button>
          <button 
            onClick={() => onPeriodChange?.('Month')}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${metabolicPeriod === 'Month' ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white'}`}
          >
            Month
          </button>
          <button 
            onClick={() => onPeriodChange?.('6 Months')}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${metabolicPeriod === '6 Months' ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white'}`}
          >
            6 Months
          </button>
        </div>
      </div>

      {/* Space-themed Metabolic Age Display */}
      <div className="flex justify-center mb-12">
        <SpaceMetabolicAge
          metabolicAge={calculatedMetabolicAge}
          actualAge={actualAge}
          yearsDifference={calculatedMetabolicAge && actualAge ? (actualAge - calculatedMetabolicAge) : null}
          size="large"
          animated={true}
        />
      </div>

      {/* Dynamic Metabolic Message */}
      <div className="text-center mb-8">
        <h2 className="text-white font-work font-bold text-lg mb-2">{getPeriodMessage()}</h2>
        <p className="text-gray-400 text-sm mb-4">{getPeriodSubtitle()}</p>
        <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
          metabolicPeriod === 'Week' ? 'bg-green-500/20 text-green-400' :
          metabolicPeriod === 'Month' ? 'bg-blue-500/20 text-blue-400' :
          'bg-purple-500/20 text-purple-400'
        }`}>
          {metabolicPeriod} View
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button 
          onClick={() => onNavigate?.("pace-of-aging")}
          className="bg-gradient-to-br from-blue-600/20 to-blue-800/30 border border-blue-500/40 rounded-2xl p-4 text-center hover:from-blue-500/30 hover:to-blue-700/40 hover:border-blue-400/60 transform hover:scale-105 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
        >
          <div className="flex items-center justify-center space-x-2">
            <span className="text-blue-400">📊</span>
            <p className="text-white font-work font-bold text-lg">Pace of Aging</p>
          </div>
          <p className="text-blue-300 text-xs mt-1">View aging analysis</p>
        </button>
        <button 
          onClick={() => onNavigate?.("aging-recommendations")}
          className="bg-gradient-to-br from-green-600/20 to-emerald-800/30 border border-green-500/40 rounded-2xl p-4 text-center hover:from-green-500/30 hover:to-emerald-700/40 hover:border-green-400/60 transform hover:scale-105 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20"
        >
          <div className="flex items-center justify-center space-x-2">
            <span className="text-green-400">💡</span>
            <p className="text-white font-work font-bold text-lg">HOW CAN I LOWER IT?</p>
          </div>
          <p className="text-green-300 text-xs mt-1">Get personalized tips</p>
        </button>
      </div>

      {/* Weekly Navigation Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={() => onNavigate?.("weekly-usage")}
          className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 text-left hover:bg-gray-800/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-work font-bold text-sm">Weekly Usage</h3>
              <p className="text-gray-400 text-xs">App engagement metrics</p>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </button>
        
        <button 
          onClick={() => onNavigate?.("weekly-summary")}
          className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 text-left hover:bg-gray-800/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-work font-bold text-sm">Weekly Summary</h3>
              <p className="text-gray-400 text-xs">Health metrics overview</p>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </button>
      </div>

      {/* Enhanced Metabolic Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Body Fat % */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-white font-work font-bold text-sm mb-1">BODY FAT %</p>
              <p className="text-purple-400 font-work font-bold text-2xl mb-1">
                {metrics?.bodyFatPercentage ? `${metrics.bodyFatPercentage}%` : 'No Data'}
              </p>
              <p className="text-yellow-400 text-xs">
                {metrics?.bodyFatPercentage ? 'High - Consider exercise' : 'Import body composition data'}
              </p>
            </div>
            <div className="ml-4">
              <MiniTrendChart 
                data={getTrendData('bodyFatPercentage')}
                color="#A855F7"
                width={60}
                height={30}
              />
            </div>
          </div>
        </div>

        {/* Muscle Mass */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-white font-work font-bold text-sm mb-1">MUSCLE MASS</p>
              <p className="text-blue-400 font-work font-bold text-2xl mb-1">
                {metrics?.muscleMass ? `${metrics.muscleMass} kg` : 'No Data'}
              </p>
              <p className="text-gray-500 text-xs">
                {metrics?.muscleMass ? 'Good muscle retention' : 'Import body composition data'}
              </p>
            </div>
            <div className="ml-4">
              <MiniTrendChart 
                data={getTrendData('muscleMass')}
                color="#3B82F6"
                width={60}
                height={30}
              />
            </div>
          </div>
        </div>

        {/* Resting Heart Rate */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-white font-work font-bold text-sm mb-1">RESTING HEART RATE</p>
              <p className="text-green-400 font-work font-bold text-2xl mb-1">
                {metrics?.restingHeartRate ? `${metrics.restingHeartRate} bpm` : 'No Data'}
              </p>
              <p className="text-green-400 text-xs">
                {metrics?.restingHeartRate ? 'Good fitness level' : 'Import heart rate data'}
              </p>
            </div>
            <div className="ml-4">
              <MiniTrendChart 
                data={getTrendData('restingHeartRate')}
                color="#22C55E"
                width={60}
                height={30}
              />
            </div>
          </div>
        </div>

        {/* VO2 Max */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-white font-work font-bold text-sm mb-1">VO₂ MAX</p>
              <p className="text-red-400 font-work font-bold text-2xl mb-1">
                {metrics?.vo2Max ? `${Number(metrics.vo2Max).toFixed(1)} mL/kg/min` : 'No Data'}
              </p>
              <p className="text-green-400 text-xs">
                {metrics?.vo2Max ? (metrics.vo2Max > 40 ? 'Above average fitness' : 'Below average fitness') : 'Import fitness data'}
              </p>
            </div>
            <div className="ml-4">
              <MiniTrendChart 
                data={getTrendData('vo2Max')}
                color="#EF4444"
                width={60}
                height={30}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="space-y-3">
        <button 
          onClick={() => onNavigate?.("weekly-usage")}
          className="w-full bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 text-left hover:bg-gray-800/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-work font-bold text-lg">Weekly Usage</p>
              <p className="text-gray-400 text-sm">Track your app engagement</p>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </button>

        <button 
          onClick={() => onNavigate?.("weekly-summary")}
          className="w-full bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 text-left hover:bg-gray-800/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-work font-bold text-lg">Weekly Summary</p>
              <p className="text-gray-400 text-sm">Review your metrics trends</p>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </button>
      </div>
    </div>
  );
}