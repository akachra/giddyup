import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Clock, 
  Target, 
  TrendingUp, 
  Activity, 
  Heart, 
  Moon, 
  Zap,
  ChevronRight,
  Lightbulb,
  Calendar,
  Utensils,
  Settings,
  RefreshCw
} from "lucide-react";

interface TimeRecommendation {
  category: string;
  action: string;
  reasoning: string;
  timing: string;
}

interface TimeBasedRecommendations {
  timeOfDay: string;
  primaryRecommendation: string;
  recommendations: TimeRecommendation[];
  recoveryInsight: string;
}

interface Exercise {
  name: string;
  sets: string;
  intensity: string;
  notes: string;
}

interface RecoveryWorkout {
  recoveryLevel: string;
  recommendedIntensity: string;
  workoutType: string;
  duration: string;
  exercises: Exercise[];
  heartRateZones: {
    target: string;
    maxHR: string;
  };
  recoveryFocus: string;
  progressionNotes: string;
}

interface KeyInsight {
  category: string;
  insight: string;
  action: string;
}

interface DailyInsights {
  dailyFocus: string;
  energyLevel: string;
  keyInsights: KeyInsight[];
  priorityActions: string[];
  adaptiveRecommendations: {
    ifEnergyHigh: string;
    ifEnergyLow: string;
    nutritionTiming: string;
  };
  tomorrowPrep: string;
  motivationalMessage: string;
}

interface EnhancedAICoachProps {
  onNavigate?: (tab: string) => void;
}

export function EnhancedAICoach({ onNavigate }: EnhancedAICoachProps = {}) {
  const [activeView, setActiveView] = useState<"overview" | "recommendations" | "workout" | "insights">("overview");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: timeRecommendations, isLoading: loadingRecommendations } = useQuery<{recommendations: TimeBasedRecommendations}>({
    queryKey: ["/api/ai-coach/time-recommendations"],
    refetchInterval: 1000 * 60 * 30, // Refresh every 30 minutes
  });

  const { data: recoveryWorkout, isLoading: loadingWorkout } = useQuery<{workout: RecoveryWorkout}>({
    queryKey: ["/api/ai-coach/recovery-workout"],
    refetchInterval: 1000 * 60 * 60, // Refresh every hour
  });

  const { data: dailyInsights, isLoading: loadingInsights } = useQuery<{insights: DailyInsights}>({
    queryKey: ["/api/ai-coach/daily-insights"],
    refetchInterval: 1000 * 60 * 60 * 2, // Refresh every 2 hours
  });

  // Force refresh mutation for on-demand coaching updates
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai-coach/refresh-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to refresh coaching cache");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all coaching queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/ai-coach/time-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-coach/recovery-workout"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-coach/daily-insights"] });
      
      toast({
        title: "Coaching Updated",
        description: "Fresh AI recommendations generated based on your latest data",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to refresh coaching recommendations",
        variant: "destructive",
      });
    },
  });

  const getTimeOfDayIcon = (timeOfDay: string) => {
    switch (timeOfDay?.toLowerCase()) {
      case 'morning': return <Clock className="h-5 w-5 text-yellow-400" />;
      case 'afternoon': return <Clock className="h-5 w-5 text-orange-400" />;
      case 'evening': return <Clock className="h-5 w-5 text-purple-400" />;
      case 'night': return <Moon className="h-5 w-5 text-blue-400" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getRecoveryLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'moderate': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'low': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'exercise': return <Activity className="h-4 w-4" />;
      case 'nutrition': return <Heart className="h-4 w-4" />;
      case 'recovery': return <Zap className="h-4 w-4" />;
      case 'sleep': return <Moon className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  if (activeView === "recommendations") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveView("overview")}
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </Button>
            <h2 className="text-xl font-work font-bold text-white">Time-Based Recommendations</h2>
          </div>
          {timeRecommendations?.recommendations && getTimeOfDayIcon(timeRecommendations.recommendations.timeOfDay)}
        </div>

        {loadingRecommendations ? (
          <div className="text-center py-8">
            <Brain className="h-8 w-8 text-[var(--giddyup-accent)] animate-pulse mx-auto mb-4" />
            <p className="text-gray-400">Analyzing your current state...</p>
          </div>
        ) : timeRecommendations?.recommendations ? (
          <div className="space-y-4">
            <Card className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-accent)]/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Target className="h-6 w-6 text-[var(--giddyup-accent)]" />
                  <div>
                    <h3 className="text-white font-work font-bold">Primary Focus</h3>
                    <p className="text-sm text-gray-400">{timeRecommendations.recommendations.timeOfDay} Recommendation</p>
                  </div>
                </div>
                <p className="text-white text-lg">{timeRecommendations.recommendations.primaryRecommendation}</p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {timeRecommendations.recommendations.recommendations.map((rec, index) => (
                <Card key={index} className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      {getCategoryIcon(rec.category)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-semibold">{rec.category}</h4>
                          <Badge variant="secondary" className="bg-[var(--giddyup-accent)]/10 text-[var(--giddyup-accent)] border-[var(--giddyup-accent)]/20 text-xs">
                            {rec.timing}
                          </Badge>
                        </div>
                        <p className="text-white mb-2">{rec.action}</p>
                        <p className="text-gray-400 text-sm">{rec.reasoning}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-[var(--giddyup-secondary)]/10 border border-[var(--giddyup-secondary)]/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-[var(--giddyup-accent)]" />
                  <h4 className="text-white font-semibold">Recovery Insight</h4>
                </div>
                <p className="text-gray-300 text-sm">{timeRecommendations.recommendations.recoveryInsight}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No recommendations available</p>
        )}
      </div>
    );
  }

  if (activeView === "workout") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveView("overview")}
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </Button>
            <h2 className="text-xl font-work font-bold text-white">Recovery-Based Workout</h2>
          </div>
          {recoveryWorkout?.workout && (
            <Badge className={getRecoveryLevelColor(recoveryWorkout.workout.recoveryLevel)}>
              {recoveryWorkout.workout.recoveryLevel} Recovery
            </Badge>
          )}
        </div>

        {loadingWorkout ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-[var(--giddyup-accent)] animate-pulse mx-auto mb-4" />
            <p className="text-gray-400">Designing your personalized workout...</p>
          </div>
        ) : recoveryWorkout?.workout ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20">
                <CardContent className="p-4 text-center">
                  <h4 className="text-white font-semibold mb-1">{recoveryWorkout.workout.workoutType}</h4>
                  <p className="text-gray-400 text-sm">Workout Type</p>
                </CardContent>
              </Card>
              <Card className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20">
                <CardContent className="p-4 text-center">
                  <h4 className="text-white font-semibold mb-1">{recoveryWorkout.workout.duration} min</h4>
                  <p className="text-gray-400 text-sm">Duration</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-white font-work font-bold">Exercises</CardTitle>
                <CardDescription className="text-gray-400">
                  Target: {recoveryWorkout.workout.heartRateZones.target} | Max: {recoveryWorkout.workout.heartRateZones.maxHR}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recoveryWorkout.workout.exercises.map((exercise, index) => (
                  <div key={index} className="bg-[var(--giddyup-secondary)]/10 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-white font-semibold">{exercise.name}</h4>
                      <Badge variant="outline" className="text-xs border-[var(--giddyup-secondary)]/40 text-gray-400">
                        {exercise.intensity}
                      </Badge>
                    </div>
                    <p className="text-gray-300 text-sm mb-1">{exercise.sets}</p>
                    <p className="text-gray-400 text-xs">{exercise.notes}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4">
              <Card className="bg-[var(--giddyup-secondary)]/10 border border-[var(--giddyup-secondary)]/20">
                <CardContent className="p-4">
                  <h4 className="text-white font-semibold mb-2">Recovery Focus</h4>
                  <p className="text-gray-300 text-sm">{recoveryWorkout.workout.recoveryFocus}</p>
                </CardContent>
              </Card>
              <Card className="bg-[var(--giddyup-secondary)]/10 border border-[var(--giddyup-secondary)]/20">
                <CardContent className="p-4">
                  <h4 className="text-white font-semibold mb-2">Progression Notes</h4>
                  <p className="text-gray-300 text-sm">{recoveryWorkout.workout.progressionNotes}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No workout available</p>
        )}
      </div>
    );
  }

  if (activeView === "insights") {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveView("overview")}
            className="text-gray-400 hover:text-white"
          >
            ← Back
          </Button>
          <h2 className="text-xl font-work font-bold text-white">Daily Insights</h2>
        </div>

        {loadingInsights ? (
          <div className="text-center py-8">
            <TrendingUp className="h-8 w-8 text-[var(--giddyup-accent)] animate-pulse mx-auto mb-4" />
            <p className="text-gray-400">Analyzing your health trends...</p>
          </div>
        ) : dailyInsights?.insights ? (
          <div className="space-y-4">
            <Card className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-accent)]/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Calendar className="h-6 w-6 text-[var(--giddyup-accent)]" />
                  <div>
                    <h3 className="text-white font-work font-bold">Today's Focus</h3>
                    <p className="text-sm text-gray-400">Performance Coaching</p>
                  </div>
                </div>
                <p className="text-white text-lg mb-4">{dailyInsights.insights.dailyFocus}</p>
                <p className="text-[var(--giddyup-accent)] text-sm">{dailyInsights.insights.recommendation}</p>
              </CardContent>
            </Card>

            <Card className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-white font-work font-bold">Priority Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dailyInsights.insights.priorityActions.map((action, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--giddyup-accent)] text-black flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <p className="text-white text-sm">{action}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-3">
              {dailyInsights.insights.keyInsights.map((insight, index) => (
                <Card key={index} className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      {getCategoryIcon(insight.category)}
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1">{insight.category}</h4>
                        <p className="text-gray-300 text-sm mb-2">{insight.insight}</p>
                        <p className="text-[var(--giddyup-accent)] text-sm">{insight.action}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-[var(--giddyup-secondary)]/10 border border-[var(--giddyup-secondary)]/20">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-3">Adaptive Recommendations</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-green-400 font-medium">If energy is high:</span>
                    <p className="text-gray-300">{dailyInsights.insights.adaptiveRecommendations.ifEnergyHigh}</p>
                  </div>
                  <div>
                    <span className="text-yellow-400 font-medium">If energy is low:</span>
                    <p className="text-gray-300">{dailyInsights.insights.adaptiveRecommendations.ifEnergyLow}</p>
                  </div>
                  <div>
                    <span className="text-blue-400 font-medium">Nutrition timing:</span>
                    <p className="text-gray-300">{dailyInsights.insights.adaptiveRecommendations.nutritionTiming}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--giddyup-accent)]/10 border border-[var(--giddyup-accent)]/20">
              <CardContent className="p-4">
                <h4 className="text-[var(--giddyup-accent)] font-semibold mb-2">Tomorrow's Preparation</h4>
                <p className="text-gray-300 text-sm">{dailyInsights.insights.tomorrowPrep}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No insights available</p>
        )}
      </div>
    );
  }

  // Overview view
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-work font-bold text-white mb-2">AI Coach</h1>
        <p className="text-gray-400">Personalized guidance based on your recovery and time of day</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card 
          className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 cursor-pointer hover:border-[var(--giddyup-accent)]/40 transition-colors"
          onClick={() => setActiveView("recommendations")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="h-8 w-8 text-[var(--giddyup-accent)]" />
                <div>
                  <h3 className="text-white font-work font-bold">Time-Based Recommendations</h3>
                  <p className="text-gray-400 text-sm">Optimized for your current time of day</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            {timeRecommendations?.recommendations && (
              <div className="mt-4 p-3 bg-[var(--giddyup-accent)]/10 rounded-lg">
                <p className="text-[var(--giddyup-accent)] text-sm font-medium">
                  {timeRecommendations.recommendations.timeOfDay}: {timeRecommendations.recommendations.primaryRecommendation}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card 
          className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 cursor-pointer hover:border-[var(--giddyup-accent)]/40 transition-colors"
          onClick={() => setActiveView("workout")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Activity className="h-8 w-8 text-[var(--giddyup-accent)]" />
                <div>
                  <h3 className="text-white font-work font-bold">Recovery-Based Workout</h3>
                  <p className="text-gray-400 text-sm">Tailored to your current recovery state</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            {recoveryWorkout?.workout && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge className={getRecoveryLevelColor(recoveryWorkout.workout.recoveryLevel) + " text-xs"}>
                    {recoveryWorkout.workout.recoveryLevel} Recovery
                  </Badge>
                  <span className="text-gray-400 text-sm">{recoveryWorkout.workout.workoutType}</span>
                </div>
                <span className="text-[var(--giddyup-accent)] text-sm font-medium">
                  {recoveryWorkout.workout.duration} min
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card 
          className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 cursor-pointer hover:border-[var(--giddyup-accent)]/40 transition-colors"
          onClick={() => setActiveView("insights")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-[var(--giddyup-accent)]" />
                <div>
                  <h3 className="text-white font-work font-bold">Daily Insights</h3>
                  <p className="text-gray-400 text-sm">Comprehensive health trend analysis</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            {dailyInsights?.insights && (
              <div className="mt-4 p-3 bg-[var(--giddyup-accent)]/10 rounded-lg">
                <p className="text-[var(--giddyup-accent)] text-sm font-medium">
                  {dailyInsights.insights.dailyFocus}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Energy: {dailyInsights.insights.energyLevel}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Actions */}
        <div className="space-y-3 mt-6">
          <h3 className="text-white font-work font-bold text-lg">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
            <Button 
              onClick={() => onNavigate?.("nutrition")}
              className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 text-white hover:bg-[var(--giddyup-secondary)]/20 justify-start h-auto py-4"
            >
              <div className="flex items-center space-x-3">
                <Utensils className="h-5 w-5 text-[var(--giddyup-accent)]" />
                <div className="text-left">
                  <p className="font-semibold">Nutrition Tracking</p>
                  <p className="text-sm text-gray-400">Log meals and track macros</p>
                </div>
              </div>
            </Button>
            
            <Button 
              onClick={() => onNavigate?.("settings")}
              className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 text-white hover:bg-[var(--giddyup-secondary)]/20 justify-start h-auto py-4"
            >
              <div className="flex items-center space-x-3">
                <Settings className="h-5 w-5 text-[var(--giddyup-accent)]" />
                <div className="text-left">
                  <p className="font-semibold">Settings</p>
                  <p className="text-sm text-gray-400">Customize your preferences</p>
                </div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}