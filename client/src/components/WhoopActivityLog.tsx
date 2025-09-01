import React from 'react';
import { WhoopStyleCard } from './WhoopStyleCard';

interface Activity {
  id: string;
  name: string;
  duration: string;
  calories: number;
  icon: string;
  date: string;
  strain?: number;
  description?: string;
}

interface WhoopActivityLogProps {
  activities: Activity[];
  onLogActivity?: () => void;
}

const sportIcons: { [key: string]: string } = {
  'Pickleball': '🏓',
  'Padel': '🎾',
  'Soccer': '⚽',
  'Swimming': '🏊',
  'Running': '🏃',
  'Hiking': '🥾',
  'Lifting': '🏋️',
  'Skiing': '⛷️'
};

export function WhoopActivityLog({ activities, onLogActivity }: WhoopActivityLogProps) {
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = activity.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as { [key: string]: Activity[] });

  return (
    <div className="bg-black min-h-screen px-4 pt-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white font-work font-bold text-2xl uppercase tracking-wide">
          Activity Log
        </h1>
        <button
          onClick={onLogActivity}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium flex items-center space-x-2"
        >
          <span className="text-lg">+</span>
          <span>Log Activity</span>
        </button>
      </div>

      {/* Activity List */}
      <div className="space-y-6">
        {Object.entries(groupedActivities).map(([date, dayActivities]) => (
          <div key={date}>
            <h3 className="text-white font-work font-semibold text-lg mb-4 capitalize">
              {date === new Date().toDateString() ? 'Today' : 
               date === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' : 
               date}
            </h3>
            
            <div className="space-y-4">
              {dayActivities.map((activity) => (
                <div key={activity.id} className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
                  <div className="flex items-start space-x-4">
                    {/* Activity Icon */}
                    <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl">
                        {sportIcons[activity.name] || '🏃'}
                      </span>
                    </div>
                    
                    {/* Activity Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-white font-work font-semibold text-lg">
                            {activity.name}
                          </h4>
                          <p className="text-gray-400 text-sm">{activity.duration}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1 text-orange-400">
                            <span className="text-sm">🔥</span>
                            <span className="font-medium">{activity.calories} kcal</span>
                          </div>
                          {activity.strain && (
                            <div className="flex items-center space-x-1 text-blue-400 mt-1">
                              <span className="text-sm">💧</span>
                              <span className="font-medium">{activity.strain}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {activity.description && (
                        <p className="text-gray-300 text-sm">
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sample activity data
export const sampleActivities: Activity[] = [];