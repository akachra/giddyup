import React from 'react';
import { useQuery } from "@tanstack/react-query";

export interface HeartRateZone {
  zone: number;
  name: string;
  minutes: number;
  color: string;
  percentage: number;
}

interface HeartRateZonesProps {
  zones: HeartRateZone[];
  totalMinutes: number;
}

export function HeartRateZones({ zones, totalMinutes }: HeartRateZonesProps) {
  const maxWidth = 100; // percentage
  
  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
      <h3 className="text-gray-400 uppercase tracking-wide text-sm font-medium mb-4">
        Time in Heart Rate Zones
      </h3>
      
      {/* Zone Bar Chart */}
      <div className="mb-6">
        <div className="flex h-3 rounded-full overflow-hidden bg-gray-800">
          {zones.map((zone, index) => (
            <div
              key={zone.zone}
              className="h-full transition-all duration-300"
              style={{
                width: `${zone.percentage}%`,
                backgroundColor: zone.color,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Zone Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        {zones.map((zone) => (
          <div key={zone.zone} className="flex items-center space-x-3">
            {/* Zone Color Indicator */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: zone.color }}
            />
            
            {/* Zone Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline space-x-2">
                <span className="text-white font-medium text-sm">
                  {zone.name}
                </span>
                <span className="text-gray-400 text-xs">
                  Zone {zone.zone}
                </span>
              </div>
              <div className="text-gray-300 text-sm font-medium">
                {zone.minutes} min
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Default zones data matching Whoop's color scheme
export const defaultHeartRateZones: HeartRateZone[] = [
  {
    zone: 5,
    name: 'Zone 5',
    minutes: 0,
    color: '#FF4444', // Red
    percentage: 0
  },
  {
    zone: 4,
    name: 'Zone 4', 
    minutes: 0,
    color: '#FF8C42', // Orange
    percentage: 0
  },
  {
    zone: 3,
    name: 'Zone 3',
    minutes: 0,
    color: '#4A9EFF', // Blue
    percentage: 0
  },
  {
    zone: 2,
    name: 'Zone 2',
    minutes: 0,
    color: '#00D570', // Green  
    percentage: 0
  },
  {
    zone: 1,
    name: 'Zone 1',
    minutes: 0,
    color: '#666666', // Gray
    percentage: 0
  }
];

// Container component that fetches heart rate zones data
export function HeartRateZonesContainer({ selectedDate }: { selectedDate: Date }) {
  const { data: zoneData, isLoading, error } = useQuery({
    queryKey: ['/api/heart-rate-zones', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const response = await fetch(`/api/heart-rate-zones?date=${selectedDate.toISOString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch heart rate zones');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
        <h3 className="text-gray-400 uppercase tracking-wide text-sm font-medium mb-4">
          Time in Heart Rate Zones
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-400">Loading heart rate zones...</div>
        </div>
      </div>
    );
  }

  if (error || !zoneData?.zones) {
    return (
      <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
        <h3 className="text-gray-400 uppercase tracking-wide text-sm font-medium mb-4">
          Time in Heart Rate Zones
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="text-gray-400 mb-2">No heart rate data available</div>
            <div className="text-gray-500 text-sm">Import Health Connect data to see heart rate zones</div>
          </div>
        </div>
      </div>
    );
  }

  const totalMinutes = zoneData.zones.reduce((sum: number, zone: HeartRateZone) => sum + zone.minutes, 0);
  
  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-400 uppercase tracking-wide text-sm font-medium">
          Time in Heart Rate Zones
        </h3>
        <div className="text-gray-500 text-xs">
          Max HR: {zoneData.maxHR} bpm
          {zoneData.source === 'calculated_from_hr_data' && (
            <span className="ml-2 text-green-400">• {zoneData.dataPoints} data points</span>
          )}
        </div>
      </div>
      
      {/* Zone Bar Chart */}
      <div className="mb-6">
        <div className="flex h-3 rounded-full overflow-hidden bg-gray-800">
          {zoneData.zones.map((zone: HeartRateZone, index: number) => (
            <div
              key={zone.zone}
              className="h-full transition-all duration-300"
              style={{
                width: `${zone.percentage}%`,
                backgroundColor: zone.color,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Zone Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        {zoneData.zones.map((zone: HeartRateZone) => (
          <div key={zone.zone} className="flex items-center space-x-3">
            {/* Zone Color Indicator */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: zone.color }}
            />
            
            {/* Zone Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline space-x-2">
                <span className="text-white font-medium text-sm">
                  {zone.name}
                </span>
                <span className="text-gray-400 text-xs">
                  Zone {zone.zone}
                </span>
              </div>
              <div className="text-gray-300 text-sm font-medium">
                {zone.minutes} min
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {zoneData.source === 'calculated_no_data' && (
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-400">📊</span>
            </div>
            <div>
              <p className="text-blue-400 text-sm font-medium mb-1">No Heart Rate Data Available</p>
              <p className="text-blue-300 text-xs leading-relaxed">
                Zones calculated using age-based formula (Max HR: {zoneData.maxHR} bpm). 
                Import Health Connect data with heart rate measurements to see personalized zone times and analysis.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}