import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, AlertTriangle, CheckCircle, Clock, Target, TrendingDown, TrendingUp } from 'lucide-react';

interface SleepNight {
  date: string;
  actual: number;
  target: number;
  quality: number;
  efficiency: number;
}

interface DebtLevel {
  level: 'optimal' | 'minor' | 'moderate' | 'significant' | 'severe';
  color: string;
  description: string;
  recommendation: string;
  icon: React.ReactNode;
}

interface EnhancedSleepDebtTrackerProps {
  sleepData: SleepNight[];
  sleepGoal: number;
}

export const EnhancedSleepDebtTracker: React.FC<EnhancedSleepDebtTrackerProps> = ({
  sleepData = [
    { date: '2025-01-01', actual: 6.2, target: 8, quality: 78, efficiency: 85 },
    { date: '2025-01-02', actual: 7.8, target: 8, quality: 89, efficiency: 92 },
    { date: '2025-01-03', actual: 5.5, target: 8, quality: 65, efficiency: 78 },
    { date: '2025-01-04', actual: 7.1, target: 8, quality: 82, efficiency: 88 },
    { date: '2025-01-05', actual: 8.2, target: 8, quality: 95, efficiency: 94 },
    { date: '2025-01-06', actual: 6.8, target: 8, quality: 76, efficiency: 84 },
    { date: '2025-01-07', actual: 7.4, target: 8, quality: 84, efficiency: 89 }
  ],
  sleepGoal = 8
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '14d' | '30d'>('7d');

  // Calculate sleep debt
  const calculateSleepDebt = (): number => {
    return sleepData.reduce((debt, night) => {
      const deficit = Math.max(0, night.target - night.actual);
      return debt + deficit;
    }, 0);
  };

  const totalDebt = calculateSleepDebt();
  const averageSleep = sleepData.reduce((sum, night) => sum + night.actual, 0) / sleepData.length;
  const averageQuality = sleepData.reduce((sum, night) => sum + night.quality, 0) / sleepData.length;

  // Determine debt level
  const getDebtLevel = (debt: number): DebtLevel => {
    if (debt <= 1) return {
      level: 'optimal',
      color: '#10B981',
      description: 'Excellent sleep consistency',
      recommendation: 'Keep up the great work! Your sleep patterns are optimal.',
      icon: <CheckCircle className="w-5 h-5" />
    };
    if (debt <= 3) return {
      level: 'minor',
      color: '#3B82F6',
      description: 'Slight sleep deficit',
      recommendation: 'Try to get an extra 30 minutes tonight to prevent debt accumulation.',
      icon: <Clock className="w-5 h-5" />
    };
    if (debt <= 6) return {
      level: 'moderate',
      color: '#F59E0B',
      description: 'Moderate sleep debt',
      recommendation: 'Plan for 1-2 nights of extended sleep to recover fully.',
      icon: <AlertTriangle className="w-5 h-5" />
    };
    if (debt <= 10) return {
      level: 'significant',
      color: '#EF4444',
      description: 'High sleep debt',
      recommendation: 'Prioritize sleep recovery. Consider weekend sleep-ins or earlier bedtimes.',
      icon: <TrendingDown className="w-5 h-5" />
    };
    return {
      level: 'severe',
      color: '#DC2626',
      description: 'Critical sleep deficit',
      recommendation: 'Urgent: Plan immediate sleep recovery strategy. Consider reducing commitments.',
      icon: <AlertTriangle className="w-5 h-5" />
    };
  };

  const debtLevel = getDebtLevel(totalDebt);

  // Calculate recovery plan
  const calculateRecoveryPlan = () => {
    const excessSleepPerNight = 1; // Extra hour per night
    const daysNeeded = Math.ceil(totalDebt / excessSleepPerNight);
    const targetBedtime = new Date();
    targetBedtime.setHours(22, 30); // 10:30 PM default

    return {
      daysNeeded,
      extraSleepNeeded: excessSleepPerNight,
      recommendedBedtime: targetBedtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const recoveryPlan = calculateRecoveryPlan();

  // Sleep trend analysis
  const getTrend = () => {
    const recent = sleepData.slice(-3);
    const older = sleepData.slice(0, 3);
    const recentAvg = recent.reduce((sum, night) => sum + night.actual, 0) / recent.length;
    const olderAvg = older.reduce((sum, night) => sum + night.actual, 0) / older.length;
    
    return {
      direction: recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable',
      difference: Math.abs(recentAvg - olderAvg)
    };
  };

  const trend = getTrend();

  return (
    <div className="bg-black text-white p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Moon className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold">Sleep Debt Analysis</h2>
        </div>
        
        {/* Period Selector */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          {(['7d', '14d', '30d'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Current Debt Status */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6 p-4 rounded-xl border"
        style={{ 
          borderColor: debtLevel.color, 
          backgroundColor: `${debtLevel.color}20` 
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div style={{ color: debtLevel.color }}>
              {debtLevel.icon}
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: debtLevel.color }}>
                {totalDebt.toFixed(1)} hours debt
              </h3>
              <p className="text-sm text-gray-300">{debtLevel.description}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-2 mb-1">
              {trend.direction === 'improving' ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : trend.direction === 'declining' ? (
                <TrendingDown className="w-4 h-4 text-red-400" />
              ) : null}
              <span className="text-sm text-gray-400">
                {trend.direction === 'stable' ? 'Stable' : 
                 trend.direction === 'improving' ? 'Improving' : 'Declining'}
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-300">{debtLevel.recommendation}</p>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {averageSleep.toFixed(1)}h
          </div>
          <p className="text-sm text-gray-400">Avg Sleep</p>
        </div>
        
        <div className="bg-gray-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {averageQuality.toFixed(0)}%
          </div>
          <p className="text-sm text-gray-400">Avg Quality</p>
        </div>
        
        <div className="bg-gray-900/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {((averageSleep / sleepGoal) * 100).toFixed(0)}%
          </div>
          <p className="text-sm text-gray-400">Goal Progress</p>
        </div>
      </div>

      {/* Recovery Plan */}
      {totalDebt > 1 && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <h3 className="font-semibold text-lg mb-3 text-green-400">Recovery Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">Days to Recovery</p>
              <p className="text-xl font-bold text-green-400">{recoveryPlan.daysNeeded}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Extra Sleep Needed</p>
              <p className="text-xl font-bold text-green-400">{recoveryPlan.extraSleepNeeded}h/night</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Target Bedtime</p>
              <p className="text-xl font-bold text-green-400">{recoveryPlan.recommendedBedtime}</p>
            </div>
          </div>
        </div>
      )}

      {/* Daily Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Daily Sleep Breakdown</h3>
        <div className="space-y-2">
          {sleepData.map((night, index) => {
            const deficit = Math.max(0, night.target - night.actual);
            const surplus = Math.max(0, night.actual - night.target);
            const date = new Date(night.date);
            
            return (
              <motion.div
                key={night.date}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-sm text-gray-400">
                    {night.actual.toFixed(1)}h / {night.target}h
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-20 bg-gray-800 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(night.actual / night.target) * 100}%` }}
                      transition={{ delay: index * 0.1 + 0.5, duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ 
                        backgroundColor: night.actual >= night.target ? '#10B981' : '#EF4444' 
                      }}
                    />
                  </div>
                  
                  <div className={`text-sm font-medium ${
                    deficit > 0 ? 'text-red-400' : surplus > 0 ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {deficit > 0 ? `-${deficit.toFixed(1)}h` : 
                     surplus > 0 ? `+${surplus.toFixed(1)}h` : '0h'}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Sleep Quality Insights */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
        <h3 className="font-semibold text-lg mb-3 text-purple-400">Quality Insights</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Nights meeting sleep goal</span>
            <span className="font-bold text-purple-400">
              {sleepData.filter(n => n.actual >= n.target).length}/{sleepData.length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Average sleep efficiency</span>
            <span className="font-bold text-purple-400">
              {(sleepData.reduce((sum, n) => sum + n.efficiency, 0) / sleepData.length).toFixed(0)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Best quality night</span>
            <span className="font-bold text-purple-400">
              {Math.max(...sleepData.map(n => n.quality))}% quality
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};