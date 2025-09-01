import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, Info, X } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Premium notification system like Whoop's coaching alerts
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 4000);
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(notification.type === 'error' ? [100, 50, 100] : 50);
    }

    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return { notifications, addNotification, removeNotification };
};

// Premium notification component
export const NotificationContainer: React.FC<{
  notifications: Notification[];
  removeNotification: (id: string) => void;
}> = ({ notifications, removeNotification }) => {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <Check className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error': return <X className="w-5 h-5 text-red-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBackgroundColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'warning': return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
      case 'error': return 'from-red-500/20 to-red-600/20 border-red-500/30';
      default: return 'from-blue-500/20 to-blue-600/20 border-blue-500/30';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300
            }}
            className={`bg-gradient-to-r ${getBackgroundColor(notification.type)} 
                       backdrop-blur-lg border rounded-xl p-4 shadow-xl`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-semibold text-sm">
                  {notification.title}
                </h4>
                <p className="text-gray-300 text-xs mt-1 leading-relaxed">
                  {notification.message}
                </p>
                {notification.action && (
                  <button
                    onClick={notification.action.onClick}
                    className="mt-2 text-xs bg-white/20 hover:bg-white/30 
                             px-3 py-1 rounded-lg transition-colors"
                  >
                    {notification.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Smart notification triggers for health insights
export const useHealthNotifications = () => {
  const { addNotification } = useNotifications();

  const triggerRecoveryAlert = (recoveryScore: number) => {
    if (recoveryScore < 33) {
      addNotification({
        type: 'warning',
        title: 'Low Recovery Detected',
        message: 'Consider taking it easy today. Your body needs more recovery time.',
        action: {
          label: 'View Recovery Tips',
          onClick: () => {/* Navigate to recovery tips */}
        }
      });
    } else if (recoveryScore > 85) {
      addNotification({
        type: 'success',
        title: 'Great Recovery!',
        message: 'Your body is well-recovered. Today is perfect for a challenging workout.',
        action: {
          label: 'Explore Workouts',
          onClick: () => {/* Navigate to workouts */}
        }
      });
    }
  };

  const triggerSleepAlert = (sleepDuration: number, sleepGoal: number) => {
    const deficit = sleepGoal - sleepDuration;
    if (deficit > 1) {
      addNotification({
        type: 'info',
        title: 'Sleep Debt Accumulating',
        message: `You're ${deficit.toFixed(1)} hours behind your sleep goal. Consider an early bedtime tonight.`,
        action: {
          label: 'Set Sleep Reminder',
          onClick: () => {/* Set sleep reminder */}
        }
      });
    }
  };

  const triggerStrainAlert = (dailyStrain: number, recoveryScore: number) => {
    if (dailyStrain > 15 && recoveryScore < 50) {
      addNotification({
        type: 'warning',
        title: 'High Strain, Low Recovery',
        message: 'Your strain is high but recovery is low. Risk of overtraining detected.',
        duration: 6000
      });
    }
  };

  return {
    triggerRecoveryAlert,
    triggerSleepAlert, 
    triggerStrainAlert
  };
};