import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface SpaceMetabolicAgeProps {
  metabolicAge: number | null;
  actualAge: number | null;
  yearsDifference: number | null;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

// Helper function to format age in years and months
const formatAgeDisplay = (age: number | null): string => {
  if (!age) return 'No Data';
  
  const years = Math.floor(age);
  const months = Math.round((age - years) * 12);
  
  if (months === 0) {
    return `${years}`;
  } else if (months === 12) {
    return `${years + 1}`;
  } else {
    return `${years}.${Math.round(months / 12 * 10)}`;
  }
};

// Helper function for detailed age display
const formatDetailedAge = (age: number | null): string => {
  if (!age) return 'No data';
  
  const years = Math.floor(age);
  const months = Math.round((age - years) * 12);
  
  if (months === 0) {
    return `${years} years`;
  } else if (months === 12) {
    return `${years + 1} years`;
  } else {
    return `${years}y ${months}m`;
  }
};

export const SpaceMetabolicAge: React.FC<SpaceMetabolicAgeProps> = ({
  metabolicAge,
  actualAge,
  yearsDifference,
  size = 'large',
  animated = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const sizeClasses = {
    small: { container: 'w-48 h-48', text: 'text-3xl', label: 'text-xs' },
    medium: { container: 'w-64 h-64', text: 'text-4xl', label: 'text-sm' },
    large: { container: 'w-80 h-80', text: 'text-6xl', label: 'text-base' }
  };

  const { container, text, label } = sizeClasses[size];

  // Animated star field background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !animated) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Star particles
    const stars: Array<{
      x: number;
      y: number;
      size: number;
      opacity: number;
      speed: number;
      angle: number;
    }> = [];

    // Generate stars within circular boundary
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxRadius = Math.min(rect.width, rect.height) / 2 - 20; // Leave space for ring
    
    for (let i = 0; i < 150; i++) {
      // Generate random position within circle
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * maxRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      stars.push({
        x,
        y,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.5 + 0.1,
        angle: Math.random() * Math.PI * 2
      });
    }

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Create radial gradient background
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const radius = Math.min(rect.width, rect.height) / 2;
      
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
      gradient.addColorStop(0.4, 'rgba(245, 158, 11, 0.08)');
      gradient.addColorStop(0.7, 'rgba(25, 25, 25, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw and animate stars
      stars.forEach((star, index) => {
        // Update star position with subtle floating motion
        const newX = star.x + Math.cos(star.angle + time * 0.001) * star.speed * 0.3;
        const newY = star.y + Math.sin(star.angle + time * 0.001) * star.speed * 0.3;
        
        // Keep stars within circular boundary
        const distFromCenter = Math.sqrt(Math.pow(newX - centerX, 2) + Math.pow(newY - centerY, 2));
        if (distFromCenter <= maxRadius) {
          star.x = newX;
          star.y = newY;
        } else {
          // Bounce back towards center if hitting boundary
          star.angle = Math.atan2(centerY - star.y, centerX - star.x) + (Math.random() - 0.5) * 0.5;
        }

        // Pulsing opacity
        const pulseOpacity = star.opacity + Math.sin(time * 0.002 + index * 0.1) * 0.3;
        
        // Different star colors based on position
        const distanceFromCenter = Math.sqrt(
          Math.pow(star.x - centerX, 2) + Math.pow(star.y - centerY, 2)
        );
        const normalizedDistance = distanceFromCenter / radius;
        
        let starColor;
        if (normalizedDistance < 0.3) {
          starColor = `rgba(255, 255, 255, ${Math.max(0, pulseOpacity)})`;
        } else if (normalizedDistance < 0.6) {
          starColor = `rgba(16, 185, 129, ${Math.max(0, pulseOpacity * 0.8)})`;
        } else {
          starColor = `rgba(245, 158, 11, ${Math.max(0, pulseOpacity * 0.6)})`;
        }

        // Draw star
        ctx.beginPath();
        ctx.fillStyle = starColor;
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Add glow effect for larger stars
        if (star.size > 2) {
          ctx.beginPath();
          ctx.fillStyle = starColor.replace(/[\d.]+\)$/g, `${Math.max(0, pulseOpacity * 0.3)})`);
          ctx.arc(star.x, star.y, star.size + 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      time += 16;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animated, size]);

  const getYearsDifferenceText = () => {
    if (yearsDifference === null || metabolicAge === null || actualAge === null) {
      return 'Import metabolic data';
    }
    
    const actualYears = Math.floor(actualAge);
    const metabolicYears = Math.floor(metabolicAge);
    const actualMonths = Math.round((actualAge - actualYears) * 12);
    const metabolicMonths = Math.round((metabolicAge - metabolicYears) * 12);
    
    const totalActualMonths = actualYears * 12 + actualMonths;
    const totalMetabolicMonths = metabolicYears * 12 + metabolicMonths;
    const diffMonths = totalActualMonths - totalMetabolicMonths;
    
    if (diffMonths === 0) {
      return 'Same as actual age';
    }
    
    const diffYears = Math.floor(Math.abs(diffMonths) / 12);
    const remainingMonths = Math.abs(diffMonths) % 12;
    
    let text = '';
    if (diffYears > 0 && remainingMonths > 0) {
      text = `${diffYears}y ${remainingMonths}m`;
    } else if (diffYears > 0) {
      text = diffYears === 1 ? '1 year' : `${diffYears} years`;
    } else {
      text = remainingMonths === 1 ? '1 month' : `${remainingMonths} months`;
    }
    
    return diffMonths > 0 ? `${text} younger` : `${text} older`;
  };

  return (
    <div className="relative flex items-center justify-center">
      <div className={`relative ${container}`}>
        {/* Animated star field canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-full"
          style={{ background: 'transparent' }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {/* Metabolic Age Display */}
          <motion.div
            initial={animated ? { opacity: 0, scale: 0.8 } : {}}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center"
          >
            {/* Main Age Number */}
            <motion.h1
              initial={animated ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className={`${metabolicAge === null ? 'text-gray-400' : 'text-white'} font-bold ${text} leading-none mb-2`}
              style={{ 
                fontFamily: 'SF Pro Display, -apple-system, sans-serif',
                textShadow: metabolicAge === null ? 'none' : '0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(0, 212, 170, 0.2)'
              }}
            >
              {formatAgeDisplay(metabolicAge)}
            </motion.h1>

            {/* Label */}
            <motion.p
              initial={animated ? { opacity: 0, y: 10 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className={`text-gray-300 font-semibold tracking-wider mb-3 ${
                size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base'
              }`}
              style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.1)' }}
            >
              METABOLIC AGE
            </motion.p>

            {/* Years Difference */}
            <motion.div
              initial={animated ? { opacity: 0, scale: 0.9 } : {}}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.3, duration: 0.4 }}
              className="text-center"
            >
              <p 
                className={`font-medium ${
                  size === 'small' ? 'text-lg' : size === 'medium' ? 'text-xl' : 'text-2xl'
                } ${(yearsDifference === null || metabolicAge === null || actualAge === null) ? 'text-gray-400' : ''}`}
                style={{ 
                  color: (yearsDifference === null || metabolicAge === null || actualAge === null) ? '#9CA3AF' : 
                         (metabolicAge < actualAge) ? '#10B981' : '#FF6B6B',
                  textShadow: (yearsDifference === null || metabolicAge === null || actualAge === null) ? 'none' : 
                             `0 0 15px ${(metabolicAge < actualAge) ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 107, 107, 0.4)'}`
                }}
              >
                {getYearsDifferenceText()}
              </p>
              
              {/* Actual age reference */}
              <p className={`text-gray-300 mt-1 ${
                size === 'small' ? 'text-xs' : 'text-sm'
              }`}
                style={{ textShadow: '0 0 8px rgba(255, 255, 255, 0.2)' }}
              >
                {actualAge === null ? 'Import age data' : `Actual: ${formatDetailedAge(actualAge)}`}
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Thick outer ring border - Whoop style */}
        <motion.div
          initial={animated ? { opacity: 0, scale: 0.9 } : {}}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute inset-1 rounded-full border opacity-90"
          style={{
            borderColor: (metabolicAge !== null && actualAge !== null) ? 
                        (actualAge - metabolicAge >= 3 ? '#10B981' :
                         actualAge - metabolicAge >= 0 ? '#F59E0B' : '#FF6B6B') : '#6B7280',
            borderWidth: '8px',
            boxShadow: `0 0 40px ${
              (metabolicAge !== null && actualAge !== null) ? 
              (actualAge - metabolicAge >= 3 ? 'rgba(16, 185, 129, 0.8)' :
               actualAge - metabolicAge >= 0 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(255, 107, 107, 0.8)') :
               'rgba(107, 114, 128, 0.5)'
            }, inset 0 0 30px ${
              (metabolicAge !== null && actualAge !== null) ? 
              (actualAge - metabolicAge >= 3 ? 'rgba(16, 185, 129, 0.3)' :
               actualAge - metabolicAge >= 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 107, 107, 0.3)') :
               'rgba(107, 114, 128, 0.2)'
            }`
          }}
        />
        
        {/* Outer glow ring */}
        <motion.div
          initial={animated ? { opacity: 0, scale: 0.5 } : {}}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute inset-0 rounded-full opacity-15"
          style={{
            background: `radial-gradient(circle, ${
              (metabolicAge !== null && actualAge !== null) ? 
              (actualAge - metabolicAge >= 3 ? 'rgba(16, 185, 129, 0.2)' :
               actualAge - metabolicAge >= 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 107, 107, 0.2)') :
               'rgba(107, 114, 128, 0.1)'
            } 0%, transparent 70%)`,
            filter: 'blur(25px)'
          }}
        />
      </div>
    </div>
  );
};