import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Moon, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Target
} from "lucide-react";

interface SleepData {
  date: string;
  sleepDuration: number; // in minutes
  sleepScore: number;
}

interface SleepDebtTrackerProps {
  recentSleep: SleepData[];
  targetSleepHours?: number; // user's ideal sleep target
}

export function SleepDebtTracker({ recentSleep, targetSleepHours = 8 }: SleepDebtTrackerProps) {
  const targetSleepMinutes = targetSleepHours * 60;

  // Calculate sleep debt over the last 7 days
  const calculateSleepDebt = () => {
    let cumulativeDebt = 0;
    const dailyDebts: { date: string; debt: number; actual: number }[] = [];

    recentSleep.slice(0, 7).forEach(night => {
      const dailyDebt = Math.max(0, targetSleepMinutes - night.sleepDuration);
      cumulativeDebt += dailyDebt;
      
      dailyDebts.push({
        date: night.date,
        debt: dailyDebt,
        actual: night.sleepDuration
      });
    });

    return {
      totalDebtMinutes: cumulativeDebt,
      totalDebtHours: cumulativeDebt / 60,
      dailyDebts: dailyDebts.reverse() // Show oldest to newest
    };
  };

  const sleepDebtData = calculateSleepDebt();
  const avgSleepHours = recentSleep.slice(0, 7).reduce((sum, night) => sum + night.sleepDuration, 0) / (7 * 60);

  const getDebtStatus = (debtHours: number) => {
    if (debtHours === 0) return { status: "Optimal", color: "text-green-400", icon: CheckCircle };
    if (debtHours < 2) return { status: "Minor Debt", color: "text-yellow-400", icon: Clock };
    if (debtHours < 5) return { status: "Moderate Debt", color: "text-orange-400", icon: AlertTriangle };
    return { status: "Significant Debt", color: "text-red-400", icon: AlertTriangle };
  };

  const getRecoveryDays = (debtHours: number) => {
    // Assuming 30 minutes of extra sleep per night to pay back debt
    return Math.ceil(debtHours / 0.5);
  };

  const debtStatus = getDebtStatus(sleepDebtData.totalDebtHours);
  const StatusIcon = debtStatus.icon;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Sleep Debt Analysis</h2>
        <p className="text-gray-400">Track your cumulative sleep deficit over time</p>
      </div>

      {/* Current Sleep Debt Status */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Moon className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-white">Current Sleep Debt</CardTitle>
            </div>
            <Badge className={`${debtStatus.color} bg-transparent border-current`}>
              {debtStatus.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <StatusIcon className={`h-6 w-6 ${debtStatus.color}`} />
                <span className="text-3xl font-bold text-white">
                  {sleepDebtData.totalDebtHours.toFixed(1)}h
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                Total sleep debt over last 7 days
              </p>
            </div>

            {sleepDebtData.totalDebtHours > 0 && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-gray-300">Recovery Plan</span>
                </div>
                <p className="text-xs text-gray-400">
                  With 30 minutes extra sleep per night, you can eliminate this debt in{' '}
                  <span className="text-white font-semibold">
                    {getRecoveryDays(sleepDebtData.totalDebtHours)} days
                  </span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sleep Target vs Actual */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Sleep Target Analysis</CardTitle>
          <CardDescription className="text-gray-400">
            Your sleep goal vs actual performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Sleep Target</span>
              <span className="text-2xl font-bold text-blue-400">{targetSleepHours}h</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">7-Day Average</span>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-white">{Math.floor(avgSleepHours)}h {Math.round((avgSleepHours % 1) * 60)}m</span>
                {avgSleepHours >= targetSleepHours ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Target Achievement</span>
                <span className="text-gray-400">
                  {Math.min((avgSleepHours / targetSleepHours) * 100, 100).toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={Math.min((avgSleepHours / targetSleepHours) * 100, 100)} 
                className="h-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Sleep Debt Breakdown */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">7-Day Sleep Debt Breakdown</CardTitle>
          <CardDescription className="text-gray-400">
            Daily deficit tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sleepDebtData.dailyDebts.map((day, index) => {
              const actualHours = day.actual / 60;
              const debtHours = day.debt / 60;
              const dayName = new Date(day.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' });
              
              return (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-400 w-8">{dayName}</span>
                    <span className="text-sm text-white">
                      {Math.floor(day.actual / 60)}h {day.actual % 60}m
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {debtHours > 0 ? (
                      <>
                        <span className="text-xs text-red-400">
                          -{debtHours.toFixed(1)}h
                        </span>
                        <div className="w-16 bg-gray-800 rounded-full h-1">
                          <div 
                            className="bg-red-400 h-1 rounded-full" 
                            style={{ width: `${Math.min((debtHours / 3) * 100, 100)}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-green-400">
                          +{((actualHours - targetSleepHours)).toFixed(1)}h
                        </span>
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sleep Debt Insights */}
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Sleep Debt Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sleepDebtData.totalDebtHours === 0 && (
              <div className="bg-green-900/20 border border-green-400/20 rounded-lg p-3">
                <p className="text-green-400 text-sm">
                  Excellent! No sleep debt. Your recovery and performance should be optimal.
                </p>
              </div>
            )}
            
            {sleepDebtData.totalDebtHours > 0 && sleepDebtData.totalDebtHours < 2 && (
              <div className="bg-yellow-900/20 border border-yellow-400/20 rounded-lg p-3">
                <p className="text-yellow-400 text-sm">
                  Minor sleep debt. Consider going to bed 15-30 minutes earlier tonight.
                </p>
              </div>
            )}
            
            {sleepDebtData.totalDebtHours >= 2 && sleepDebtData.totalDebtHours < 5 && (
              <div className="bg-orange-900/20 border border-orange-400/20 rounded-lg p-3">
                <p className="text-orange-400 text-sm">
                  Moderate sleep debt may impact your recovery scores and energy levels. Prioritize sleep this week.
                </p>
              </div>
            )}
            
            {sleepDebtData.totalDebtHours >= 5 && (
              <div className="bg-red-900/20 border border-red-400/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  Significant sleep debt is likely affecting performance, mood, and health. Focus on sleep hygiene and earlier bedtimes.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}