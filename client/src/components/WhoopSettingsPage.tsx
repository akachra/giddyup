import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { UserProfile } from './UserProfile';

interface WhoopSettingsPageProps {
  onBack?: () => void;
}

export function WhoopSettingsPage({ onBack }: WhoopSettingsPageProps) {
  const [showProfile, setShowProfile] = useState(false);

  if (showProfile) {
    return <UserProfile onBack={() => setShowProfile(false)} />;
  }

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        { label: 'Personal Info', icon: '👤', hasArrow: true },
        { label: 'Subscription', icon: '💳', hasArrow: true },
        { label: 'Privacy Settings', icon: '🔒', hasArrow: true }
      ]
    },
    {
      title: 'Data & Sync',
      items: [
        { label: 'Health Connect', icon: '🔗', toggle: true, enabled: true },
        { label: 'Google Fit', icon: '📱', toggle: true, enabled: false },
        { label: 'Apple Health', icon: '🍎', toggle: true, enabled: true },
        { label: 'Strava', icon: '🏃', toggle: true, enabled: true }
      ]
    },
    {
      title: 'Notifications',
      items: [
        { label: 'Recovery Alerts', icon: '💚', toggle: true, enabled: true },
        { label: 'Strain Reminders', icon: '🔥', toggle: true, enabled: true },
        { label: 'Sleep Insights', icon: '😴', toggle: true, enabled: false },
        { label: 'Weekly Reports', icon: '📊', toggle: true, enabled: true }
      ]
    },
    {
      title: 'Preferences',
      items: [
        { label: 'Units (Metric)', icon: '📐', hasArrow: true },
        { label: 'Time Zone', icon: '🌍', hasArrow: true },
        { label: 'Language', icon: '🗣️', hasArrow: true },
        { label: 'Dark Mode', icon: '🌙', toggle: true, enabled: true }
      ]
    },
    {
      title: 'Support',
      items: [
        { label: 'Help Center', icon: '❓', hasArrow: true },
        { label: 'Contact Support', icon: '💬', hasArrow: true },
        { label: 'Feature Requests', icon: '💡', hasArrow: true },
        { label: 'App Version 4.21.0', icon: 'ℹ️', hasArrow: false }
      ]
    }
  ];

  return (
    <div className="bg-black min-h-screen px-4 pt-8 pb-24">
      {/* Header */}
      <div className="flex items-center mb-8">
        {onBack && (
          <Button onClick={onBack} variant="ghost" className="mr-4 text-white">
            ← Back
          </Button>
        )}
        <h1 className="text-white font-work font-bold text-2xl uppercase tracking-wide">
          Settings
        </h1>
      </div>

      {/* Profile Section */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">JD</span>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-work font-bold text-xl mb-1">
              John Doe
            </h3>
            <p className="text-gray-400 text-sm">
              Member since March 2023
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 text-sm font-medium">
                WHOOP 4.0 Connected
              </span>
            </div>
          </div>
          <span className="text-gray-400">→</span>
        </div>
      </div>

      {/* Settings Groups */}
      <div className="space-y-6">
        {settingsGroups.map((group, groupIndex) => (
          <div key={group.title}>
            <h3 className="text-gray-400 font-work font-medium text-sm mb-3 uppercase tracking-wide">
              {group.title}
            </h3>
            
            <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 overflow-hidden">
              {group.items.map((item, index) => (
                <div 
                  key={item.label}
                  className={`flex items-center justify-between p-4 ${
                    index < group.items.length - 1 ? 'border-b border-gray-800/50' : ''
                  } ${item.hasArrow && item.label === 'Personal Info' ? 'cursor-pointer hover:bg-gray-800/50' : ''}`}
                  onClick={item.label === 'Personal Info' ? () => setShowProfile(true) : undefined}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-white font-medium">{item.label}</span>
                  </div>
                  
                  <div className="flex items-center">
                    {item.toggle ? (
                      <Switch 
                        checked={item.enabled} 
                        className="data-[state=checked]:bg-green-500"
                      />
                    ) : item.hasArrow ? (
                      <span className="text-gray-400">→</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="mt-8 space-y-4">
        <Button 
          variant="outline" 
          className="w-full bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10"
        >
          Sign Out
        </Button>
        
        <div className="text-center">
          <p className="text-gray-500 text-xs">
            © 2025 GiddyUp Health. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}