import React, { useEffect, useState } from 'react';
import { WhoopCloudVisual } from './WhoopCloudVisual';
import { SpaceMetabolicAge } from './SpaceMetabolicAge';
import { MiniTrendChart } from './MiniTrendChart';
import { useQuery } from '@tanstack/react-query';

interface MetabolicData {
  metabolicAge: number | null;
  actualAge: number | null;
  yearsDifference: number | null;
  vo2Max: number | null;
  restingMetabolicRate: number | null;
  bodyFatPercentage: number | null;
  muscleMass: number | null;
  waterPercentage: number | null;
  visceralFat: number | null;
  boneDensity: number | null;
  fitnessAge: number | null;
  weight: number | null;
  bmi: number | null;
  restingHeartRate: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
}

interface WhoopMetabolicTabProps {
  data?: MetabolicData;
}

const defaultData: MetabolicData = {
  metabolicAge: null,
  actualAge: null,
  yearsDifference: null,
  vo2Max: null,
  restingMetabolicRate: null,
  bodyFatPercentage: null,
  muscleMass: null,
  waterPercentage: null,
  visceralFat: null,
  boneDensity: null,
  fitnessAge: null,
  weight: null,
  bmi: null,
  restingHeartRate: null,
  bloodPressureSystolic: null,
  bloodPressureDiastolic: null
};

export function WhoopMetabolicTab({ data = defaultData }: WhoopMetabolicTabProps) {
  // Fetch historical health metrics for trend charts
  const { data: historicalMetrics } = useQuery({
    queryKey: ['/api/health-metrics', 30],
    queryFn: () => fetch('/api/health-metrics?days=30').then(res => res.json())
  });

  // Helper function to extract trend data with forward-fill for missing values
  const getTrendData = (metricName: string) => {
    if (!historicalMetrics || !Array.isArray(historicalMetrics)) {
      return [];
    }
    
    // Sort by date ascending and extract last 14 days
    const sortedMetrics = historicalMetrics
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);
    
    if (sortedMetrics.length === 0) {
      return [];
    }
    
    const trendData = [];
    let lastValue = null;
    
    for (const metric of sortedMetrics) {
      let currentValue = null;
      
      // Extract the appropriate metric value
      switch (metricName) {
        case 'vo2Max':
          currentValue = metric.vo2Max;
          break;
        case 'restingMetabolicRate':
          currentValue = metric.restingMetabolicRate;
          break;
        case 'bodyFatPercentage':
          currentValue = metric.bodyFatPercentage;
          break;
        case 'muscleMass':
          currentValue = metric.muscleMass;
          break;
        case 'waterPercentage':
          currentValue = metric.waterPercentage;
          break;
        case 'visceralFat':
          currentValue = metric.visceralFat;
          break;
        case 'weight':
          currentValue = metric.weight;
          break;
        case 'bmi':
          currentValue = metric.bmi;
          break;
        case 'restingHeartRate':
          currentValue = metric.restingHeartRate;
          break;
        case 'bloodPressureSystolic':
          currentValue = metric.bloodPressureSystolic;
          break;
        case 'bloodPressureDiastolic':
          currentValue = metric.bloodPressureDiastolic;
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
    const changeStr = change > 0 ? `+${change.toFixed(1)}${unit}` : `${change.toFixed(1)}${unit}`;
    
    return changeStr;
  };

  const metabolicInsights = [
    {
      label: 'VO₂ Max',
      value: data.vo2Max ? `${data.vo2Max} ml/kg/min` : 'No Data',
      change: getTrendChange(getTrendData('vo2Max'), ' ml/kg/min'),
      changeType: 'none' as const,
      description: 'Cardiovascular fitness',
      trendData: getTrendData('vo2Max'),
      status: data.vo2Max ? 'Excellent' : 'Import fitness data'
    },
    {
      label: 'RMR',
      value: data.restingMetabolicRate ? `${data.restingMetabolicRate} kcal` : 'No Data',
      change: getTrendChange(getTrendData('restingMetabolicRate'), ' kcal'),
      changeType: 'none' as const,
      description: 'Resting Metabolic Rate',
      trendData: getTrendData('restingMetabolicRate'),
      status: data.restingMetabolicRate ? 'Above Average' : 'Import metabolic data'
    },
    {
      label: 'Body Fat',
      value: data.bodyFatPercentage ? `${data.bodyFatPercentage}%` : 'No Data',
      change: getTrendChange(getTrendData('bodyFatPercentage'), '%'),
      changeType: 'none' as const,
      description: 'Body Fat Percentage',
      trendData: getTrendData('bodyFatPercentage'),
      status: data.bodyFatPercentage ? 'Athletic' : 'Import body composition'
    },
    {
      label: 'Muscle Mass',
      value: data.muscleMass ? `${data.muscleMass} kg` : 'No Data',
      change: getTrendChange(getTrendData('muscleMass'), ' kg'),
      changeType: 'none' as const,
      description: 'Lean Muscle Mass',
      trendData: getTrendData('muscleMass'),
      status: data.muscleMass ? 'Excellent' : 'Import body composition'
    },
    {
      label: 'Hydration',
      value: data.waterPercentage ? `${data.waterPercentage}%` : 'No Data',
      change: getTrendChange(getTrendData('waterPercentage'), '%'),
      changeType: 'none' as const,
      description: 'Body Water Percentage',
      trendData: getTrendData('waterPercentage'),
      status: data.waterPercentage ? 'Optimal' : 'Import hydration data'
    },
    {
      label: 'Visceral Fat',
      value: data.visceralFat ? `${data.visceralFat}` : 'No Data',
      change: getTrendChange(getTrendData('visceralFat')),
      changeType: 'none' as const,
      description: 'Visceral Fat Rating',
      trendData: getTrendData('visceralFat'),
      status: data.visceralFat ? 'Healthy' : 'Import body composition'
    },
    {
      label: 'Weight',
      value: data.weight ? `${data.weight} lbs` : 'No Data',
      change: getTrendChange(getTrendData('weight'), ' lbs'),
      changeType: 'none' as const,
      description: 'Body Weight',
      trendData: getTrendData('weight'),
      status: data.weight ? 'Tracking' : 'Import weight data'
    },
    {
      label: 'BMI',
      value: data.bmi ? `${data.bmi.toFixed(1)}` : 'No Data',
      change: getTrendChange(getTrendData('bmi')),
      changeType: 'none' as const,
      description: 'Body Mass Index',
      trendData: getTrendData('bmi'),
      status: data.bmi ? 'Normal' : 'Import height/weight data'
    },
    {
      label: 'Resting HR',
      value: data.restingHeartRate ? `${data.restingHeartRate} bpm` : 'No Data',
      change: getTrendChange(getTrendData('restingHeartRate'), ' bpm'),
      changeType: 'none' as const,
      description: 'Resting Heart Rate',
      trendData: getTrendData('restingHeartRate'),
      status: data.restingHeartRate ? 'Excellent' : 'Import heart rate data'
    },
    {
      label: 'Blood Pressure',
      value: data.bloodPressureSystolic && data.bloodPressureDiastolic ? 
        `${data.bloodPressureSystolic}/${data.bloodPressureDiastolic}` : 'No Data',
      change: getTrendChange(getTrendData('bloodPressureSystolic'), ' mmHg'),
      changeType: 'none' as const,
      description: 'Systolic/Diastolic Pressure',
      trendData: getTrendData('bloodPressureSystolic'),
      status: data.bloodPressureSystolic ? 'Normal' : 'Import BP data'
    }
  ];

  return (
    <div className="bg-black min-h-screen px-4 pt-8 pb-24">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-white font-work font-bold text-2xl mb-2 uppercase tracking-wide">
          Metabolic Health
        </h1>
        <p className="text-gray-400">
          Comprehensive body composition & metabolic analysis
        </p>
      </div>

      {/* Space-themed Metabolic Age Display */}
      <div className="mb-8">
        <SpaceMetabolicAge
          metabolicAge={data.metabolicAge}
          actualAge={data.actualAge}
          yearsDifference={data.yearsDifference}
          size="large"
          animated={true}
        />
      </div>

      {/* Key Insights Summary */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#252525] rounded-2xl border border-gray-700/50 p-4 mb-6">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            <span className="text-gray-400 text-xl">📊</span>
          </div>
          <div>
            <h4 className="text-white font-medium mb-1">Import Health Data</h4>
            <p className="text-gray-300 text-sm leading-relaxed">
              Connect your fitness tracker or smart scale to analyze metabolic health metrics, body composition, and track improvements over time.
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="space-y-4 mb-6">
        <h3 className="text-white font-work font-bold text-xl">Detailed Analysis</h3>
        
        {metabolicInsights.map((metric, index) => (
          <div 
            key={metric.label}
            className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-work font-bold text-xl">
                    {metric.label}
                  </h3>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                    {metric.status}
                  </span>
                </div>
                <p className="text-white font-work font-bold text-3xl mb-1">
                  {metric.value}
                </p>
                <p className="text-gray-400 text-sm">
                  {metric.description}
                </p>
              </div>
              
              <div className="ml-6 text-right">
                <div className="mb-2">
                  <MiniTrendChart 
                    data={metric.trendData}
                    color="#22C55E"
                    width={80}
                    height={40}
                  />
                </div>
                <p className="text-sm font-medium text-gray-400">
                  {metric.change}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fitness Age Comparison */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl border border-blue-500/30 p-6">
        <div className="text-center">
          <h3 className="text-white font-work font-bold text-xl mb-2">
            Fitness Age
          </h3>
          <div className="flex items-center justify-center space-x-6 mb-4">
            <div className="text-center">
              <p className="text-blue-400 font-work font-bold text-4xl">
                {data.fitnessAge || 'No Data'}
              </p>
              <p className="text-gray-400 text-sm">Fitness Age</p>
            </div>
            <div className="text-gray-400 text-2xl">vs</div>
            <div className="text-center">
              <p className="text-gray-400 font-work font-bold text-4xl">
                {data.actualAge || 'No Data'}
              </p>
              <p className="text-gray-400 text-sm">Chronological Age</p>
            </div>
          </div>
          <p className="text-gray-400 font-medium">
            {(data.actualAge && data.fitnessAge) ? 
              `Your cardiovascular fitness is ${data.actualAge - data.fitnessAge} years ahead` :
              'Import fitness and age data for comparison'
            }
          </p>
        </div>
      </div>
    </div>
  );
}