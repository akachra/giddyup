import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  TrendingDown, 
  TrendingUp, 
  Target,
  AlertTriangle,
  CheckCircle,
  Zap,
  BarChart3
} from "lucide-react";

interface StrainData {
  date: string;
  strainScore: number; // 0-21 scale like Whoop
  activities: string[];
}

interface TrainingLoadTrackerProps {
  recentStrain: StrainData[];
  fitnessLevel?: "beginner" | "intermediate" | "advanced"; // affects load capacity
}

export function TrainingLoadTracker({ recentStrain, fitnessLevel = "intermediate" }: TrainingLoadTrackerProps) {
  // Training load capacity based on fitness level
  const getLoadCapacity = () => {
    switch (fitnessLevel) {
      case "beginner": return { weekly: 80, optimal: 60 };
      case "intermediate": return { weekly: 120, optimal: 90 };
      case "advanced": return { weekly: 160, optimal: 120 };
      default: return { weekly: 120, optimal: 90 };
    }
  };

  const capacity = getLoadCapacity();

  // Calculate training load metrics
  const calculateTrainingLoad = () => {
    const last7Days = recentStrain.slice(0, 7);
    const last14Days = recentStrain.slice(0, 14);
    
    // Current week load (sum of strain scores)
    const currentWeekLoad = last7Days.reduce((sum, day) => sum + day.strainScore, 0);
    
    // Previous week load for comparison
    const previousWeekLoad = recentStrain.slice(7, 14).reduce((sum, day) => sum + day.strainScore, 0);
    
    // Acute load (last 7 days average)
    const acuteLoad = currentWeekLoad / 7;
    
    // Chronic load (last 28 days average, using available data)
    const availableDays = Math.min(recentStrain.length, 28);
    const chronicLoad = recentStrain.slice(0, availableDays).reduce((sum, day) => sum + day.strainScore, 0) / availableDays;
    
    // Acute:Chronic ratio (training stress balance)
    const acuteChronicRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1;
    
    // Load progression (week over week change)
    const loadProgression = previousWeekLoad > 0 ? ((currentWeekLoad - previousWeekLoad) / previousWeekLoad) * 100 : 
      currentWeekLoad > 0 ? 100 : 0; // Show 100% if we have current week data but no previous week data

    return {
      currentWeekLoad,
      previousWeekLoad,
      acuteLoad,
      chronicLoad,
      acuteChronicRatio,
      loadProgression,
      last7Days
    };
  };

  const loadData = calculateTrainingLoad();

  // Get load status and recommendations
  const getLoadStatus = (weeklyLoad: number, ratio: number) => {
    if (weeklyLoad < capacity.optimal * 0.6) {
      return { status: "Deload", color: "text-blue-400", icon: TrendingDown, recommendation: "Good recovery week. Consider increasing intensity next week." };
    }
    if (weeklyLoad <= capacity.optimal) {
      return { status: "Optimal", color: "text-green-400", icon: CheckCircle, recommendation: "Perfect training load. Maintain this intensity." };
    }
    if (weeklyLoad <= capacity.weekly) {
      return { status: "High Load", color: "text-yellow-400", icon: TrendingUp, recommendation: "High but manageable. Monitor recovery closely." };
    }
    return { status: "Overreaching", color: "text-red-400", icon: AlertTriangle, recommendation: "Risk of overtraining. Consider reducing intensity." };
  };

  // Get acute:chronic ratio status  
  const getRatioStatus = (ratio: number) => {
    if (ratio < 0.8) return { status: "Detraining Risk", color: "text-blue-400", description: "Load may be too low for adaptation" };
    if (ratio <= 1.3) return { status: "Sweet Spot", color: "text-green-400", description: "Optimal training stress" };
    if (ratio <= 1.5) return { status: "High Risk", color: "text-yellow-400", description: "Elevated injury risk" };
    return { status: "Very High Risk", color: "text-red-400", description: "Significant overreaching" };
  };

  const loadStatus = getLoadStatus(loadData.currentWeekLoad, loadData.acuteChronicRatio);
  const ratioStatus = getRatioStatus(loadData.acuteChronicRatio);
  const StatusIcon = loadStatus.icon;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Training Load Analysis</h2>
        <p className="text-gray-400">Monitor cumulative training stress and recovery balance</p>
      </div>

      {/* Current Training Load Status */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-orange-400" />
              <CardTitle className="text-white">Weekly Training Load</CardTitle>
            </div>
            <Badge className={`${loadStatus.color} bg-transparent border-current`}>
              {loadStatus.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <StatusIcon className={`h-6 w-6 ${loadStatus.color}`} />
                <span className="text-3xl font-bold text-white">
                  {loadData.currentWeekLoad ? loadData.currentWeekLoad.toFixed(0) : "0"}
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                Total strain units this week
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Capacity Utilization</span>
                <span className="text-gray-400">
                  {loadData.currentWeekLoad ? Math.min((loadData.currentWeekLoad / capacity.weekly) * 100, 100).toFixed(0) : "0"}%
                </span>
              </div>
              <Progress 
                value={loadData.currentWeekLoad ? Math.min((loadData.currentWeekLoad / capacity.weekly) * 100, 100) : 0} 
                className="h-2" 
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Optimal: {capacity.optimal}</span>
                <span>Max: {capacity.weekly}</span>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-gray-300">Recommendation</span>
              </div>
              <p className="text-xs text-gray-400">
                {loadStatus.recommendation}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acute:Chronic Ratio */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Training Stress Balance</CardTitle>
          <CardDescription className="text-gray-400">
            Acute:Chronic Load Ratio (injury risk indicator)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Current Ratio</span>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-white">{loadData.acuteChronicRatio ? loadData.acuteChronicRatio.toFixed(2) : "1.00"}</span>
                <Badge className={`${ratioStatus.color} bg-transparent border-current text-xs`}>
                  {ratioStatus.status}
                </Badge>
              </div>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-xs text-gray-400">
                {ratioStatus.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">Acute Load (7d avg)</p>
                <p className="text-lg font-bold text-white">{loadData.acuteLoad ? loadData.acuteLoad.toFixed(1) : "0.0"}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400">Chronic Load (28d avg)</p>
                <p className="text-lg font-bold text-white">{loadData.chronicLoad ? loadData.chronicLoad.toFixed(1) : "0.0"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Progression */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Load Progression</CardTitle>
          <CardDescription className="text-gray-400">
            Week-over-week training load change
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">This Week</span>
              <span className="text-2xl font-bold text-white">{loadData.currentWeekLoad ? loadData.currentWeekLoad.toFixed(0) : "0"}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Last Week</span>
              <span className="text-lg text-gray-400">{loadData.previousWeekLoad ? loadData.previousWeekLoad.toFixed(0) : "0"}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">Change</span>
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-bold ${(loadData.loadProgression || 0) >= 0 ? 'text-orange-400' : 'text-blue-400'}`}>
                  {(loadData.loadProgression || 0) >= 0 ? '+' : ''}{loadData.loadProgression ? loadData.loadProgression.toFixed(1) : "0.0"}%
                </span>
                {(loadData.loadProgression || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-orange-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-blue-400" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Load Breakdown */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">7-Day Load Breakdown</CardTitle>
          <CardDescription className="text-gray-400">
            Daily strain distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loadData.last7Days.map((day, index) => {
              // Fix timezone issues by parsing the date correctly
              const dateObj = new Date(day.date + 'T00:00:00');
              const dayName = dateObj.toLocaleDateString('en', { weekday: 'short' });
              const strainScore = day.strainScore || 0;
              const strainLevel = strainScore <= 4 ? 'Low' : strainScore <= 10 ? 'Moderate' : 'High';
              const strainColor = strainScore <= 4 ? 'text-green-400' : strainScore <= 10 ? 'text-yellow-400' : 'text-red-400';
              
              return (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-400 w-8">{dayName}</span>
                    <div className="flex items-center space-x-2">
                      <Zap className="h-3 w-3 text-orange-400" />
                      <span className="text-sm text-white">
                        {strainScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs ${strainColor}`}>
                      {strainLevel}
                    </span>
                    <div className="w-16 bg-gray-800 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full ${strainScore <= 4 ? 'bg-green-400' : strainScore <= 10 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min((strainScore / 21) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Training Load Insights */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Load Management Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(loadData.acuteChronicRatio || 0) > 1.3 && (
              <div className="bg-red-900/20 border border-red-400/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  High acute:chronic ratio detected. Consider reducing training intensity or adding extra rest days.
                </p>
              </div>
            )}
            
            {loadData.acuteChronicRatio >= 0.8 && loadData.acuteChronicRatio <= 1.3 && (
              <div className="bg-green-900/20 border border-green-400/20 rounded-lg p-3">
                <p className="text-green-400 text-sm">
                  Excellent training stress balance. You're in the optimal adaptation zone.
                </p>
              </div>
            )}
            
            {loadData.acuteChronicRatio < 0.8 && (
              <div className="bg-blue-900/20 border border-blue-400/20 rounded-lg p-3">
                <p className="text-blue-400 text-sm">
                  Low training stress. Consider gradually increasing workout intensity to maintain fitness gains.
                </p>
              </div>
            )}

            {Math.abs(loadData.loadProgression) > 25 && (
              <div className="bg-yellow-900/20 border border-yellow-400/20 rounded-lg p-3">
                <p className="text-yellow-400 text-sm">
                  Large week-to-week change ({loadData.loadProgression.toFixed(0)}%). Gradual progression is safer for long-term adaptation.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}