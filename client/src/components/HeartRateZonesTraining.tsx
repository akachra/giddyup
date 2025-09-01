import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Play, Pause, Square } from 'lucide-react';
import { HapticButton } from './HapticFeedback';

interface HeartRateZone {
  name: string;
  min: number;
  max: number;
  color: string;
  description: string;
  benefit: string;
}

interface HeartRateZonesTrainingProps {
  currentHeartRate?: number;
  maxHeartRate?: number;
  onZoneChange?: (zone: HeartRateZone) => void;
}

export const HeartRateZonesTraining: React.FC<HeartRateZonesTrainingProps> = ({
  currentHeartRate = 0,
  maxHeartRate = 190,
  onZoneChange
}) => {
  const [isActive, setIsActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [targetZone, setTargetZone] = useState<number>(2);

  const zones: HeartRateZone[] = [
    {
      name: 'Recovery',
      min: Math.round(maxHeartRate * 0.5),
      max: Math.round(maxHeartRate * 0.6),
      color: '#6B7280',
      description: 'Active recovery',
      benefit: 'Promotes recovery and fat burning'
    },
    {
      name: 'Aerobic Base',
      min: Math.round(maxHeartRate * 0.6),
      max: Math.round(maxHeartRate * 0.7),
      color: '#3B82F6',
      description: 'Easy conversational pace',
      benefit: 'Builds aerobic base and endurance'
    },
    {
      name: 'Aerobic',
      min: Math.round(maxHeartRate * 0.7),
      max: Math.round(maxHeartRate * 0.8),
      color: '#10B981',
      description: 'Comfortable hard pace',
      benefit: 'Improves aerobic capacity'
    },
    {
      name: 'Lactate Threshold',
      min: Math.round(maxHeartRate * 0.8),
      max: Math.round(maxHeartRate * 0.9),
      color: '#F59E0B',
      description: 'Comfortably hard to hard',
      benefit: 'Increases lactate threshold'
    },
    {
      name: 'VO2 Max',
      min: Math.round(maxHeartRate * 0.9),
      max: maxHeartRate,
      color: '#EF4444',
      description: 'Very hard to maximal',
      benefit: 'Boosts maximum power and speed'
    }
  ];

  const getCurrentZone = (): HeartRateZone | null => {
    return zones.find(zone => currentHeartRate >= zone.min && currentHeartRate <= zone.max) || null;
  };

  const getZonePercentage = (zone: HeartRateZone): number => {
    if (currentHeartRate < zone.min) return 0;
    if (currentHeartRate > zone.max) return 100;
    return ((currentHeartRate - zone.min) / (zone.max - zone.min)) * 100;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    const currentZone = getCurrentZone();
    if (currentZone && onZoneChange) {
      onZoneChange(currentZone);
    }
  }, [currentHeartRate, onZoneChange]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentZone = getCurrentZone();

  return (
    <div className="bg-black text-white p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Heart className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold">HR Zone Training</h2>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{currentHeartRate}</div>
          <div className="text-sm text-gray-400">bpm</div>
        </div>
      </div>

      {/* Current Zone Display */}
      {currentZone && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6 p-4 rounded-xl border-2"
          style={{ borderColor: currentZone.color, backgroundColor: `${currentZone.color}20` }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg" style={{ color: currentZone.color }}>
              {currentZone.name} Zone
            </h3>
            <div className="text-sm text-gray-300">
              {currentZone.min}-{currentZone.max} bpm
            </div>
          </div>
          <p className="text-sm text-gray-300 mb-1">{currentZone.description}</p>
          <p className="text-xs text-gray-400">{currentZone.benefit}</p>
        </motion.div>
      )}

      {/* Zone Visualization */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium">Heart Rate Zones</span>
          <span className="text-sm text-gray-400">Target: Zone {targetZone + 1}</span>
        </div>
        
        <div className="space-y-2">
          {zones.map((zone, index) => {
            const isInZone = currentZone?.name === zone.name;
            const percentage = getZonePercentage(zone);
            
            return (
              <div
                key={zone.name}
                className={`relative p-3 rounded-lg border transition-all cursor-pointer ${
                  isInZone 
                    ? 'border-white shadow-lg' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => setTargetZone(index)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{zone.name}</span>
                  <span className="text-xs text-gray-400">
                    {zone.min}-{zone.max}
                  </span>
                </div>
                
                {/* Zone Progress Bar */}
                <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{ backgroundColor: zone.color }}
                    initial={{ width: 0 }}
                    animate={{ width: isInZone ? `${percentage}%` : '0%' }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                
                {isInZone && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-1 right-1"
                  >
                    <div 
                      className="w-3 h-3 rounded-full animate-pulse"
                      style={{ backgroundColor: zone.color }}
                    />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Training Controls */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <HapticButton
            onClick={() => setIsActive(!isActive)}
            hapticType="medium"
            className={`p-3 rounded-xl ${
              isActive 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-green-500 hover:bg-green-600'
            } transition-colors`}
          >
            {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </HapticButton>
          
          <HapticButton
            onClick={() => {
              setIsActive(false);
              setElapsedTime(0);
            }}
            hapticType="light"
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
          >
            <Square className="w-5 h-5" />
          </HapticButton>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-mono">{formatTime(elapsedTime)}</div>
          <div className="text-xs text-gray-400">elapsed</div>
        </div>
      </div>

      {/* Zone Audio Cues (mock for now) */}
      {currentZone && targetZone !== zones.findIndex(z => z.name === currentZone.name) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg"
        >
          <p className="text-sm text-yellow-400">
            {currentHeartRate < zones[targetZone].min 
              ? `Speed up to reach ${zones[targetZone].name} zone` 
              : `Slow down to reach ${zones[targetZone].name} zone`
            }
          </p>
        </motion.div>
      )}
    </div>
  );
};