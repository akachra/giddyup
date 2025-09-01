import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Heart, 
  Moon, 
  Sunrise, 
  Sun, 
  Sunset,
  Activity,
  TrendingUp
} from "lucide-react";

interface WomensHealthProps {
  metrics: {
    menstrualCycleDay?: number;
    cyclePhase?: string;
    recoveryScore?: number;
    sleepScore?: number;
    stressLevel?: number;
    heartRateVariability?: number;
  };
}

export function WomensHealthTracker({ metrics }: WomensHealthProps) {
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  const getPhaseIcon = (phase: string) => {
    switch (phase?.toLowerCase()) {
      case 'menstrual': return <Moon className="h-5 w-5 text-red-400" />;
      case 'follicular': return <Sunrise className="h-5 w-5 text-yellow-400" />;
      case 'ovulation': return <Sun className="h-5 w-5 text-orange-400" />;
      case 'luteal': return <Sunset className="h-5 w-5 text-purple-400" />;
      default: return <Calendar className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase?.toLowerCase()) {
      case 'menstrual': return "bg-red-400/10 text-red-400 border-red-400/20";
      case 'follicular': return "bg-yellow-400/10 text-yellow-400 border-yellow-400/20";
      case 'ovulation': return "bg-orange-400/10 text-orange-400 border-orange-400/20";
      case 'luteal': return "bg-purple-400/10 text-purple-400 border-purple-400/20";
      default: return "bg-gray-400/10 text-gray-400 border-gray-400/20";
    }
  };

  const getPhaseRecommendations = (phase: string, recovery: number = 75) => {
    const recommendations: Record<string, {
      exercise: string;
      nutrition: string;
      recovery: string;
      energy: string;
    }> = {
      menstrual: {
        exercise: "Gentle yoga, walking, or light stretching. Listen to your body.",
        nutrition: "Focus on iron-rich foods, hydration, and anti-inflammatory options.",
        recovery: "Prioritize extra sleep and stress management. Expect lower energy.",
        energy: "Energy may be lowest. Plan lighter activities and rest when needed."
      },
      follicular: {
        exercise: "Great time for new workouts! Energy is building - try HIIT or strength training.",
        nutrition: "Lean proteins and complex carbs support growing energy levels.",
        recovery: "Recovery should improve. Good time to challenge yourself.",
        energy: "Rising energy levels. Perfect for goal-setting and new challenges."
      },
      ovulation: {
        exercise: "Peak performance time! High-intensity workouts and personal records.",
        nutrition: "Support high activity with balanced macros and plenty of water.",
        recovery: "Best recovery period. Take advantage of peak performance.",
        energy: "Highest energy and strength. Ideal for competitions and challenges."
      },
      luteal: {
        exercise: "Steady cardio and strength training. May feel less motivated - that's normal.",
        nutrition: "Complex carbs help with mood. Limit processed foods and caffeine.",
        recovery: "Focus on stress management. Sleep may be affected.",
        energy: "Energy may fluctuate. Adjust expectations and be kind to yourself."
      }
    };
    
    return recommendations[phase?.toLowerCase()] || recommendations.follicular;
  };

  const getCycleProgress = (day: number) => {
    return Math.min((day / 28) * 100, 100);
  };

  if (!trackingEnabled && !metrics.cyclePhase) {
    return (
      <Card className="bg-black/40 border-gray-800">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Heart className="h-6 w-6 text-pink-400" />
            <CardTitle className="text-white">Women's Health Insights</CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Get personalized recommendations based on your menstrual cycle
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-gray-300 text-sm">
              Track your cycle to receive tailored training, nutrition, and recovery recommendations
              that align with your hormonal patterns.
            </p>
            <ul className="text-gray-400 text-xs space-y-1">
              <li>• Optimized workout intensity by cycle phase</li>
              <li>• Nutrition recommendations for hormonal support</li>
              <li>• Recovery insights based on cycle patterns</li>
              <li>• Energy level predictions and planning</li>
            </ul>
          </div>
          <Button
            onClick={() => setTrackingEnabled(true)}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            Enable Cycle Tracking
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentPhase = metrics.cyclePhase || 'follicular';
  const cycleDay = metrics.menstrualCycleDay || 1;
  const recommendations = getPhaseRecommendations(currentPhase, metrics.recoveryScore);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Women's Health Insights</h2>
        <p className="text-gray-400">Cycle-optimized health and fitness guidance</p>
      </div>

      {/* Current Cycle Status */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getPhaseIcon(currentPhase)}
              <CardTitle className="text-white">Current Cycle Phase</CardTitle>
            </div>
            <Badge className={getPhaseColor(currentPhase)}>
              {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Cycle Day</span>
              <span className="text-2xl font-bold text-white">{cycleDay}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Cycle Progress</span>
                <span className="text-gray-400">{Math.round(getCycleProgress(cycleDay))}%</span>
              </div>
              <Progress value={getCycleProgress(cycleDay)} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycle-Based Recommendations */}
      <div className="grid gap-4">
        <Card className="bg-black/40 border-gray-800">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-400" />
              <CardTitle className="text-white text-lg">Exercise Recommendations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 text-sm">{recommendations.exercise}</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-gray-800">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-400" />
              <CardTitle className="text-white text-lg">Nutrition Focus</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 text-sm">{recommendations.nutrition}</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-gray-800">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Moon className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-white text-lg">Recovery & Sleep</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 text-sm">{recommendations.recovery}</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-gray-800">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-yellow-400" />
              <CardTitle className="text-white text-lg">Energy Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 text-sm">{recommendations.energy}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cycle Impact on Metrics */}
      {(metrics.recoveryScore || metrics.heartRateVariability) && (
        <Card className="bg-black/40 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Cycle Impact on Health Metrics</CardTitle>
            <CardDescription className="text-gray-400">
              How your current phase affects your body's performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {metrics.recoveryScore && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{metrics.recoveryScore}%</div>
                  <div className="text-sm text-gray-400">Recovery Score</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {currentPhase === 'menstrual' && "Lower recovery is normal"}
                    {currentPhase === 'ovulation' && "Peak recovery expected"}
                    {(currentPhase === 'follicular' || currentPhase === 'luteal') && "Moderate recovery"}
                  </div>
                </div>
              )}
              {metrics.heartRateVariability && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{metrics.heartRateVariability}ms</div>
                  <div className="text-sm text-gray-400">HRV</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {currentPhase === 'luteal' && "May be lower in luteal phase"}
                    {currentPhase === 'follicular' && "Should improve this phase"}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}