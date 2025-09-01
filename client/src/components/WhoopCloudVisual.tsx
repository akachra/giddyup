import React from 'react';

interface WhoopCloudVisualProps {
  metabolicAge: number;
  actualAge: number;
  yearsDifference: number;
}

export function WhoopCloudVisual({ metabolicAge, actualAge, yearsDifference }: WhoopCloudVisualProps) {
  return (
    <div className="relative h-64 overflow-hidden rounded-2xl bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Animated Stars Background */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-60 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Constellation Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-30">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D570" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#4A9EFF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FFA500" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        
        <path
          d="M50 20 L120 60 L180 40 L220 80 L280 50 L320 90"
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2"
          strokeDasharray="4,6"
          className="animate-pulse"
        />
        
        <path
          d="M20 120 L80 100 L140 130 L200 110 L260 140 L320 120"
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2"
          strokeDasharray="6,4"
          className="animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        
        <path
          d="M30 180 L90 160 L150 190 L210 170 L270 200 L330 180"
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2"
          strokeDasharray="3,8"
          className="animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </svg>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-40 animate-bounce"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Central Glow Effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-32 bg-gradient-radial from-green-400/20 via-blue-400/10 to-transparent rounded-full animate-pulse" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <div className="mb-4">
          <h2 className="text-white font-work font-bold text-4xl mb-2 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">
            {metabolicAge}
          </h2>
          <p className="text-gray-300 font-work text-lg tracking-wide">
            Metabolic Age
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl border border-green-400/30 px-6 py-4 shadow-2xl">
          <p className="text-green-400 font-work font-bold text-2xl mb-1 drop-shadow-md">
            {yearsDifference} YEARS YOUNGER
          </p>
          <p className="text-gray-300 text-sm">
            Than your chronological age of {actualAge}
          </p>
        </div>
      </div>

      {/* Corner Accents */}
      <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-green-400/50 rounded-tl-xl" />
      <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-blue-400/50 rounded-tr-xl" />
      <div className="absolute bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-purple-400/50 rounded-bl-xl" />
      <div className="absolute bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-orange-400/50 rounded-br-xl" />
    </div>
  );
}