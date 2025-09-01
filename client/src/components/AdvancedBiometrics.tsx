import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, 
  Activity, 
  Thermometer, 
  Wind, 
  Droplets,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface AdvancedBiometricsProps {
  metrics: {
    vo2Max?: number;
    stressLevel?: number;
    skinTemperature?: number;
    oxygenSaturation?: number;
    respiratoryRate?: number;
    healthspan?: number;
    restingHeartRate?: number;
    heartRateVariability?: number;
  };
}

export function AdvancedBiometrics({ metrics }: AdvancedBiometricsProps) {
  const getStressColor = (level: number) => {
    if (level <= 30) return "text-green-400 bg-green-400/10";
    if (level <= 60) return "text-yellow-400 bg-yellow-400/10";
    return "text-red-400 bg-red-400/10";
  };

  const getVO2MaxCategory = (vo2: number, age: number = 30) => {
    // Simplified VO2 Max categories for adults
    if (vo2 >= 50) return { category: "Excellent", color: "text-green-400" };
    if (vo2 >= 40) return { category: "Good", color: "text-blue-400" };
    if (vo2 >= 30) return { category: "Fair", color: "text-yellow-400" };
    return { category: "Poor", color: "text-red-400" };
  };

  const getHealthspanInsight = (healthspan: number) => {
    if (healthspan > 0) return `${healthspan} years younger`;
    if (healthspan < 0) return `${Math.abs(healthspan)} years older`;
    return "Age-appropriate";
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Advanced Biometrics</h2>
        <p className="text-gray-400">Comprehensive health insights beyond basic metrics</p>
      </div>

      {/* Cardiovascular Health */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-400" />
            <CardTitle className="text-white">Cardiovascular Health</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {metrics.vo2Max && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">VO₂ Max</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-white">{metrics.vo2Max}</span>
                  <span className="text-gray-400 ml-1">ml/kg/min</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Fitness Level</span>
                <Badge className={`${getVO2MaxCategory(metrics.vo2Max).color} bg-transparent border-current`}>
                  {getVO2MaxCategory(metrics.vo2Max).category}
                </Badge>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {metrics.restingHeartRate && (
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{metrics.restingHeartRate}</div>
                <div className="text-sm text-gray-400">Resting HR</div>
              </div>
            )}
            {metrics.heartRateVariability && (
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{metrics.heartRateVariability}</div>
                <div className="text-sm text-gray-400">HRV (ms)</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stress & Recovery */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white">Stress & Recovery</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {metrics.stressLevel && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Current Stress Level</span>
                <Badge className={`${getStressColor(metrics.stressLevel)} border-current`}>
                  {metrics.stressLevel <= 30 ? 'Low' : metrics.stressLevel <= 60 ? 'Moderate' : 'High'}
                </Badge>
              </div>
              <Progress value={metrics.stressLevel} className="h-2" />
              <div className="text-sm text-gray-400">
                {metrics.stressLevel <= 30 && "Great time for intense training"}
                {metrics.stressLevel > 30 && metrics.stressLevel <= 60 && "Consider moderate activity"}
                {metrics.stressLevel > 60 && "Focus on recovery and relaxation"}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Respiratory & Temperature */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Respiratory & Temperature</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {metrics.respiratoryRate && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Wind className="h-4 w-4 text-blue-300" />
                  <span className="text-sm text-gray-400">Respiratory Rate</span>
                </div>
                <div className="text-xl font-bold text-white">{metrics.respiratoryRate} bpm</div>
              </div>
            )}
            
            {metrics.skinTemperature && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Thermometer className="h-4 w-4 text-orange-300" />
                  <span className="text-sm text-gray-400">Skin Temp</span>
                </div>
                <div className="text-xl font-bold text-white">{metrics.skinTemperature.toFixed(1)}°C</div>
              </div>
            )}

            {metrics.oxygenSaturation && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Droplets className="h-4 w-4 text-cyan-300" />
                  <span className="text-sm text-gray-400">Blood Oxygen</span>
                </div>
                <div className="text-xl font-bold text-white">{metrics.oxygenSaturation}%</div>
                {metrics.oxygenSaturation >= 95 ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Healthspan & Longevity */}
      {metrics.healthspan && (
        <Card className="bg-black/40 border-gray-800">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <CardTitle className="text-white">Healthspan & Longevity</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Your biological age vs chronological age
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-purple-400">
                {getHealthspanInsight(metrics.healthspan)}
              </div>
              <div className="text-sm text-gray-400">
                Based on your health metrics, your body is performing 
                {metrics.healthspan > 0 ? ' better' : metrics.healthspan < 0 ? ' slower' : ' at the level'} 
                {' '}than your chronological age.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}