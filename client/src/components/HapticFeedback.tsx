import React, { useCallback } from 'react';

// Enhanced haptic feedback system for premium app feel
export const useHapticFeedback = () => {
  const triggerLight = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Light tap
    }
  }, []);

  const triggerMedium = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20); // Medium tap
    }
  }, []);

  const triggerSuccess = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 100]); // Success pattern
    }
  }, []);

  const triggerError = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 100]); // Error pattern
    }
  }, []);

  return {
    triggerLight,
    triggerMedium, 
    triggerSuccess,
    triggerError
  };
};

// Enhanced button component with haptic feedback
interface HapticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hapticType?: 'light' | 'medium' | 'success' | 'error';
  children: React.ReactNode;
}

export const HapticButton: React.FC<HapticButtonProps> = ({ 
  hapticType = 'light', 
  children, 
  onClick, 
  ...props 
}) => {
  const { triggerLight, triggerMedium, triggerSuccess, triggerError } = useHapticFeedback();

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger haptic feedback
    switch (hapticType) {
      case 'light':
        triggerLight();
        break;
      case 'medium':
        triggerMedium();
        break;
      case 'success':
        triggerSuccess();
        break;
      case 'error':
        triggerError();
        break;
    }

    // Call original onClick
    if (onClick) {
      onClick(e);
    }
  }, [hapticType, onClick, triggerLight, triggerMedium, triggerSuccess, triggerError]);

  return (
    <button 
      {...props} 
      onClick={handleClick}
      className={`transition-all duration-150 active:scale-95 ${props.className || ''}`}
    >
      {children}
    </button>
  );
};