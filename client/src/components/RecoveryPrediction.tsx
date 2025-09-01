import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Brain, Moon, Heart, Zap } from 'lucide-react';

interface RecoveryFactors {
  sleepDuration: number;
  sleepQuality: number;
  heartRateVariability: number;
  restingHeartRate: number;
  dailyStrain: number;
  stressLevel: number;
  hydration: number;
  nutrition: number;
}

interface PredictionData {
  predictedRecovery: number;
  confidence: number;
  factors: {
    name: string;
    impact: number; // -100 to 100
    icon: React.ReactNode;
    description: string;
  }[];
  recommendations: string[];
  trend: 'improving' | 'declining' | 'stable';
}

interface RecoveryPredictionProps {
  currentFactors: Partial<RecoveryFactors>;
  historicalData?: number[]; // Last 7 days of recovery scores
}

export const RecoveryPrediction: React.FC<RecoveryPredictionProps> = ({
  currentFactors,
  historicalData = [78, 82, 75, 88, 91, 85, 83]
}) => {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // AI-powered recovery prediction algorithm
  const calculateRecoveryPrediction = (factors: Partial<RecoveryFactors>): PredictionData => {
    const {
      sleepDuration,
      sleepQuality,
      heartRateVariability,
      restingHeartRate,
      dailyStrain,
      stressLevel,
      hydration,
      nutrition
    } = factors;

    // Early return if critical data is missing
    if (!heartRateVariability || !sleepDuration || !sleepQuality) {
      return {
        predictedRecovery: 0,
        confidence: 0,
        factors: [],
        recommendations: ['Import HRV, sleep data, and activity data for recovery predictions'],
        trend: 'stable'
      };
    }

    // Base recovery calculation
    let baseRecovery = 50;
    
    // Sleep impact (40% of recovery)
    const sleepScore = (sleepDuration / 8) * sleepQuality / 100;
    const sleepImpact = (sleepScore * 40);
    baseRecovery += sleepImpact;
    
    // HRV impact (25% of recovery) 
    const hrvImpact = ((heartRateVariability - 30) / 50) * 25;
    baseRecovery += hrvImpact;
    
    // Strain impact (20% of recovery)
    const strainImpact = Math.max(-20, (15 - dailyStrain) * 1.5);
    baseRecovery += strainImpact;
    
    // Other factors (15% combined)
    const otherImpact = ((100 - stressLevel) / 100) * 5 + 
                       (hydration / 100) * 5 + 
                       (nutrition / 100) * 5;
    baseRecovery += otherImpact;

    // Clamp between 0-100
    const predictedRecovery = Math.max(0, Math.min(100, Math.round(baseRecovery)));

    // Calculate trend from historical data
    const recentAvg = historicalData.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const olderAvg = historicalData.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const trendDiff = recentAvg - olderAvg;
    
    let trend: 'improving' | 'declining' | 'stable';
    if (trendDiff > 3) trend = 'improving';
    else if (trendDiff < -3) trend = 'declining';
    else trend = 'stable';

    // Calculate confidence based on data consistency
    const variance = historicalData.reduce((acc, val) => {
      return acc + Math.pow(val - recentAvg, 2);
    }, 0) / historicalData.length;
    const confidence = Math.max(60, Math.min(95, 100 - variance * 2));

    // Factor analysis
    const analysisFactors = [
      {
        name: 'Sleep Quality',
        impact: Math.round((sleepScore - 0.7) * 100),
        icon: <Moon className="w-4 h-4" />,
        description: sleepScore > 0.8 ? 'Excellent sleep foundation' : sleepScore > 0.6 ? 'Good sleep, room for improvement' : 'Poor sleep affecting recovery'
      },
      {
        name: 'Heart Rate Variability',
        impact: Math.round(((heartRateVariability - 35) / 30) * 50),
        icon: <Heart className="w-4 h-4" />,
        description: heartRateVariability > 50 ? 'High HRV indicates good recovery' : heartRateVariability > 35 ? 'Moderate HRV' : 'Low HRV suggests stress or fatigue'
      },
      {
        name: 'Training Strain',
        impact: Math.round((15 - dailyStrain) * 3),
        icon: <Zap className="w-4 h-4" />,
        description: dailyStrain > 18 ? 'High strain may impair recovery' : dailyStrain > 12 ? 'Moderate training load' : 'Light training supports recovery'
      },
      {
        name: 'Stress Level',
        impact: Math.round((50 - stressLevel) * 0.8),
        icon: <Brain className="w-4 h-4" />,
        description: stressLevel > 60 ? 'High stress negatively impacts recovery' : stressLevel > 30 ? 'Moderate stress levels' : 'Low stress promotes recovery'
      }
    ];

    // Generate recommendations
    const recommendations: string[] = [];
    if (sleepDuration < 7) recommendations.push('Aim for 7-9 hours of sleep tonight');
    if (heartRateVariability < 35) recommendations.push('Try meditation or breathing exercises');
    if (dailyStrain > 16) recommendations.push('Consider a lighter training day tomorrow');
    if (stressLevel > 50) recommendations.push('Focus on stress management techniques');
    if (hydration < 70) recommendations.push('Increase water intake throughout the day');
    if (nutrition < 70) recommendations.push('Prioritize nutrient-dense meals and protein');

    if (recommendations.length === 0) {
      recommendations.push('Great job! Keep maintaining these healthy habits');
    }

    return {
      predictedRecovery,
      confidence: Math.round(confidence),
      factors: analysisFactors,
      recommendations,
      trend
    };
  };

  useEffect(() => {
    setIsLoading(true);
    // Simulate AI processing time
    const timer = setTimeout(() => {
      const predictionData = calculateRecoveryPrediction(currentFactors);
      setPrediction(predictionData);
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentFactors]);

  if (isLoading) {
    return (
      <div className="bg-black text-white p-6 rounded-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <Brain className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold">AI Recovery Prediction</h2>
        </div>
        
        <div className="text-center py-8">
          <motion.div
            className="w-12 h-12 mx-auto mb-4 border-4 border-purple-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-400">Analyzing your data...</p>
        </div>
      </div>
    );
  }

  if (!prediction) return null;

  const getTrendIcon = () => {
    switch (prediction.trend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'declining':
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    switch (prediction.trend) {
      case 'improving': return 'text-green-400';
      case 'declining': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-black text-white p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold">Recovery Prediction</h2>
        </div>
        <div className="flex items-center space-x-2">
          {getTrendIcon()}
          <span className={`text-sm ${getTrendColor()}`}>
            {prediction.trend}
          </span>
        </div>
      </div>

      {/* Prediction Score */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center mb-6"
      >
        <div className="mb-2">
          <span className="text-4xl font-bold text-purple-400">
            {prediction.predictedRecovery}%
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-1">Predicted Tomorrow</p>
        <p className="text-xs text-gray-500">
          {prediction.confidence}% confidence based on your patterns
        </p>
      </motion.div>

      {/* Factor Analysis */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Recovery Factors</h3>
        <div className="space-y-3">
          {prediction.factors.map((factor, index) => (
            <motion.div
              key={factor.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  factor.impact > 10 ? 'bg-green-500/20' : 
                  factor.impact < -10 ? 'bg-red-500/20' : 
                  'bg-gray-500/20'
                }`}>
                  {factor.icon}
                </div>
                <div>
                  <p className="font-medium text-sm">{factor.name}</p>
                  <p className="text-xs text-gray-400">{factor.description}</p>
                </div>
              </div>
              <div className={`text-sm font-mono ${
                factor.impact > 0 ? 'text-green-400' : 
                factor.impact < 0 ? 'text-red-400' : 
                'text-gray-400'
              }`}>
                {factor.impact > 0 ? '+' : ''}{factor.impact}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Optimization Tips</h3>
        <div className="space-y-2">
          {prediction.recommendations.map((rec, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start space-x-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"
            >
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
              <p className="text-sm text-purple-100">{rec}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};