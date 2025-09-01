import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { format } from "date-fns";
import { 
  Plus, 
  ChevronRight, 
  Heart, 
  Moon, 
  Zap, 
  Activity, 
  MessageSquare,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNavigation from "@/components/BottomNavigation";
import { Settings } from "./Settings";
import { EnhancedAICoach } from "@/components/EnhancedAICoach";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SleepDebtTracker } from "@/components/SleepDebtTracker";
import { TrainingLoadTracker } from "@/components/TrainingLoadTracker";
import { WhoopStyleCircularMetric } from "@/components/WhoopStyleCircularMetric";
import { WhoopStyleCard } from "@/components/WhoopStyleCard";
import { WhoopStyleAICoaching } from "@/components/WhoopStyleAICoaching";
import { HeartRateZones, defaultHeartRateZones, HeartRateZonesContainer } from "@/components/HeartRateZones";
import { SleepStagesChart, defaultSleepStages } from "@/components/SleepStagesChart";
import { MiniTrendChart } from "@/components/MiniTrendChart";
import { WhoopActivityLog, sampleActivities } from "@/components/WhoopActivityLog";
import { WhoopHealthMetrics } from "@/components/WhoopHealthMetrics";
import { WhoopDashboardAI } from "@/components/WhoopDashboardAI";
import { WhoopMetabolicTab } from "@/components/WhoopMetabolicTab";
import { EnhancedMetabolicTab } from "@/components/EnhancedMetabolicTab";
import { MetabolicRecommendations } from "@/components/MetabolicRecommendations";
import { WhoopSettingsPage } from "@/components/WhoopSettingsPage";
import { HealthConnectImporter } from "@/components/HealthConnectImporter";
import { useDate } from "@/contexts/DateContext";
import { TabHeader } from "@/components/TabHeader";

// Helper functions for activity data processing
const calculateActivityDuration = (activity: any): number => {
  if (!activity.startTime || !activity.endTime) return 0;
  const start = new Date(activity.startTime);
  const end = new Date(activity.endTime);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
};

const generateHeartRateZonesFromActivity = (activity: any): any[] => {
  if (!activity.averageHeartRate || !activity.maxHeartRate) {
    return defaultHeartRateZones;
  }

  const maxHR = activity.maxHeartRate;
  const avgHR = activity.averageHeartRate;
  const duration = calculateActivityDuration(activity);
  
  // Estimate time in zones based on activity type and heart rates
  const estimateTimeInZones = () => {
    if (activity.type === 'Running' && avgHR > 140) {
      // High intensity running - more time in higher zones
      return {
        zone1: Math.round(duration * 0.1), // 10% in zone 1
        zone2: Math.round(duration * 0.2), // 20% in zone 2
        zone3: Math.round(duration * 0.3), // 30% in zone 3
        zone4: Math.round(duration * 0.3), // 30% in zone 4
        zone5: Math.round(duration * 0.1)  // 10% in zone 5
      };
    } else if (activity.type === 'Strength' && avgHR > 120) {
      // Strength training - more time in moderate zones
      return {
        zone1: Math.round(duration * 0.2),
        zone2: Math.round(duration * 0.4),
        zone3: Math.round(duration * 0.3),
        zone4: Math.round(duration * 0.1),
        zone5: 0
      };
    } else {
      // Walking or light activity - mostly low zones
      return {
        zone1: Math.round(duration * 0.5),
        zone2: Math.round(duration * 0.4),
        zone3: Math.round(duration * 0.1),
        zone4: 0,
        zone5: 0
      };
    }
  };

  const zoneMinutes = estimateTimeInZones();
  const totalMinutes = Object.values(zoneMinutes).reduce((a: any, b: any) => a + b, 0) || 1;

  return [
    {
      zone: 1,
      name: "Active Recovery",
      minutes: zoneMinutes.zone1,
      color: "#6B7280",
      percentage: (zoneMinutes.zone1 / totalMinutes) * 100
    },
    {
      zone: 2,
      name: "Endurance",
      minutes: zoneMinutes.zone2,
      color: "#3B82F6",
      percentage: (zoneMinutes.zone2 / totalMinutes) * 100
    },
    {
      zone: 3,
      name: "Aerobic",
      minutes: zoneMinutes.zone3,
      color: "#10B981",
      percentage: (zoneMinutes.zone3 / totalMinutes) * 100
    },
    {
      zone: 4,
      name: "Anaerobic",
      minutes: zoneMinutes.zone4,
      color: "#F59E0B",
      percentage: (zoneMinutes.zone4 / totalMinutes) * 100
    },
    {
      zone: 5,
      name: "Max Effort",
      minutes: zoneMinutes.zone5,
      color: "#EF4444",
      percentage: (zoneMinutes.zone5 / totalMinutes) * 100
    }
  ].filter(zone => zone.minutes > 0);
};

type TabType = "dashboard" | "sleep" | "strain" | "coach" | "vitals" | "metabolic" | "activity" | "nutrition" | "settings" | "recovery" | "sleep-details" | "activity-log" | "metric-details" | "mopup-breakdown" | "log-activity" | "recovery-breakdown" | "sleep-debt" | "training-load" | "weekly-usage" | "weekly-summary" | "pace-of-aging" | "aging-recommendations";

interface HealthMetric {
  id: string;
  userId: string;
  date: string;
  sleepScore?: number | null;
  sleepDuration?: number | null;
  deepSleep?: number | null;
  remSleep?: number | null;
  lightSleep?: number | null;
  recoveryScore?: number | null;
  strainScore?: number | null;
  restingHeartRate?: number | null;
  heartRateVariability?: number | null;
  metabolicAge?: number | null;
  readinessScore?: number | null;
  weight?: number | null;
  bodyFatPercentage?: number | null;
  muscleMass?: number | null;
  subcutaneousFat?: number | null;
  visceralFat?: number | null;
  basalMetabolicRate?: number | null;
  steps?: number | null;
  distance?: number | null;
  caloriesBurned?: number | null;
  activityRingCompletion?: number | null;
  bmr?: number | null;
  createdAt?: string;
}

interface Conversation {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [chatMessage, setChatMessage] = useState("");
  const [agingMethod, setAgingMethod] = useState<'whoop' | 'scientific'>('scientific');
  const [recommendationMethod, setRecommendationMethod] = useState<'whoop' | 'scientific'>('scientific');

  // Helper function to get manual calories from Settings (Priority 1)
  const getManualCaloriesFromSettings = (userSettings: any): number | null => {
    if (!userSettings?.manualCalories || userSettings.manualCalories <= 0) {
      return null;
    }
    return userSettings.manualCalories;
  };


  const [metabolicPeriod, setMetabolicPeriod] = useState<'Week' | 'Month' | '6 Months'>('Week');
  const [summaryPeriod, setSummaryPeriod] = useState<'7D' | '30D' | '90D'>('7D');
  // Start with yesterday's date (Aug 5th)
  // Use global date context instead of local state
  const { selectedDate, setSelectedDate, navigateDate, formatSelectedDate } = useDate();
  const [activityForm, setActivityForm] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    distance: '',
    calories: '',
    notes: ''
  });
  const [editingActivity, setEditingActivity] = useState<any>(null);


  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update activity form date when selectedDate changes
  React.useEffect(() => {
    setActivityForm(prev => ({
      ...prev,
      date: selectedDate.toISOString().split('T')[0]
    }));
  }, [selectedDate]);

  // Helper function to get days count for API query
  const getDaysCount = () => {
    switch(summaryPeriod) {
      case '7D': return 7;
      case '30D': return 30;
      case '90D': return 90;
      default: return 7;
    }
  };

  const { data: metrics = [] } = useQuery<HealthMetric[]>({
    queryKey: ["/api/health-metrics", summaryPeriod],
    queryFn: () => fetch(`/api/health-metrics?days=${getDaysCount()}`).then(res => res.json()),
  });

  // Effect to automatically select the date with most complete data (disabled to prevent date jumping)
  // useEffect(() => {
  //   if (metrics && metrics.length > 0) {
  //     // Find the date with the most comprehensive data (sleep + activity)
  //     const mostCompleteDate = metrics.find(m => 
  //       m.sleepScore && m.sleepDuration && m.steps && m.caloriesBurned && m.heartRateVariability
  //     );
  //     
  //     if (mostCompleteDate) {
  //       // Parse date in local timezone to avoid timezone conversion issues
  //       const dateParts = mostCompleteDate.date.split('T')[0].split('-');
  //       const completeDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
  //       completeDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
  //       // Only auto-select if it's different from current selection
  //       if (completeDate.toISOString().split('T')[0] !== selectedDate.toISOString().split('T')[0]) {
  //         setSelectedDate(completeDate);
  //       }
  //     }
  //   }
  // }, [metrics]); // Run when metrics data loads

  const { data: selectedDateMetrics, refetch: refetchSelectedMetrics, isLoading: isLoadingSelectedDate } = useQuery<HealthMetric | null>({
    queryKey: ["/api/health-metrics", selectedDate.toISOString().split('T')[0]],
    queryFn: () => fetch(`/api/health-metrics?date=${selectedDate.toISOString().split('T')[0]}`).then(res => res.json()),
    enabled: true,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes before refetching
    cacheTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/ai/conversations"],
  });

  // Add user settings query for manual calories
  const { data: userSettings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const activitiesQuery = useQuery({
    queryKey: ['/api/activities'],
    queryFn: () => fetch('/api/activities?days=7').then(res => res.json())
  });

  const activities = activitiesQuery.data || [];

  // Delete activity mutation
  const deleteActivity = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      toast({
        title: "Activity Deleted",
        description: "Activity has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to delete activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch sleep stage data for the selected date
  const { data: sleepStageData = [] } = useQuery({
    queryKey: ['/api/health-data-points/sleep-stages', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const dateParam = selectedDate.toISOString().split('T')[0];
      const url = `/api/health-data-points?dataType=sleep_stages&date=${dateParam}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      return data;
    },
    enabled: true
  });

  // Fetch AI coaching insights for the selected date
  const { data: aiInsights, isLoading: isLoadingInsights } = useQuery({
    queryKey: ["/api/ai-coach/daily-insights", selectedDate.toISOString().split('T')[0]],
    queryFn: () => fetch(`/api/ai-coach/daily-insights?date=${selectedDate.toISOString().split('T')[0]}`).then(res => res.json()),
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
  });

  // Fetch user profile to get actual age from birthdate
  const { data: userProfile } = useQuery<User>({
    queryKey: ['/api/profile'],
  });

  // Fetch all manual heart rate data for trend charts
  const { data: allManualHeartRateData = [] } = useQuery({
    queryKey: ['/api/manual-heart-rate'],
    queryFn: () => fetch('/api/manual-heart-rate').then(res => res.json()),
  });

  // Helper function to calculate age from birthdate
  const calculateAge = (birthdate: Date | null): number => {
    if (!birthdate) {
      // Default birthdate: May 4, 1975
      const defaultBirthdate = new Date('1975-05-04');
      const today = new Date();
      let age = today.getFullYear() - defaultBirthdate.getFullYear();
      const monthDiff = today.getMonth() - defaultBirthdate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < defaultBirthdate.getDate())) {
        age--;
      }
      return age;
    }
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };


  // Helper function to format metabolic age in years and months
  const formatMetabolicAge = (metabolicAge: number | null): { display: string; years: number; months: number } => {
    if (!metabolicAge) return { display: 'No Data', years: 0, months: 0 };
    
    const years = Math.floor(metabolicAge);
    const months = Math.round((metabolicAge - years) * 12);
    
    if (months === 0) {
      return { display: `${years}y`, years, months };
    } else if (months === 12) {
      return { display: `${years + 1}y`, years: years + 1, months: 0 };
    } else {
      return { display: `${years}y ${months}m`, years, months };
    }
  };

  // Calculate recovery score using proxy method when HRV is missing
  const calculateProxyRecoveryScore = (metrics: any, weeklyMetrics: any[]): number => {
    if (!metrics) return 0;
    
    // 1. Sleep Score (50% weight)
    const sleepDurationScore = metrics.sleepDuration ? Math.min((metrics.sleepDuration / 480) * 100, 100) : 0;
    const deepREMMinutes = (metrics.deepSleep || 0) + (metrics.remSleep || 0);
    const sleepQualityScore = metrics.sleepDuration && deepREMMinutes > 0 ? 
      Math.min((deepREMMinutes / metrics.sleepDuration) * 100, 100) : 70;
    const sleepScore = (sleepDurationScore * 0.6) + (sleepQualityScore * 0.4);
    
    // 2. Activity Score (30% weight)
    const activityScore = calculateActivityScore(metrics.steps, metrics.caloriesBurned);
    
    // 3. RHR Adjustment (20% weight)
    let rhrAdjustment = 75; // Default
    if (metrics.restingHeartRate && weeklyMetrics?.length > 0) {
      const rhrValues = weeklyMetrics
        .filter(d => d.restingHeartRate && d.restingHeartRate > 0)
        .map(d => d.restingHeartRate);
      
      if (rhrValues.length > 0) {
        const rhrBaseline = rhrValues.reduce((sum, rhr) => sum + rhr, 0) / rhrValues.length;
        const currentRHR = metrics.restingHeartRate;
        
        if (currentRHR < rhrBaseline) {
          rhrAdjustment = 100;
        } else if (currentRHR > rhrBaseline + 10) {
          rhrAdjustment = 50;
        } else {
          rhrAdjustment = 100 - ((currentRHR - rhrBaseline) / 10) * 50;
        }
      }
    }
    
    // Final recovery score: Sleep 50% + Activity 30% + RHR 20%
    const recoveryScore = (sleepScore * 0.5) + (activityScore * 0.3) + (rhrAdjustment * 0.2);
    return Math.max(0, Math.min(100, Math.round(recoveryScore)));
  };

  // Get the correct recovery score (proxy method if no HRV, otherwise stored value)
  const getRecoveryScore = (dayMetrics: any): number => {
    if (!dayMetrics) return 0;
    
    // Use proxy method when HRV is missing
    if (!dayMetrics.heartRateVariability && dayMetrics.sleepDuration) {
      return calculateProxyRecoveryScore(dayMetrics, metrics || []);
    }
    
    // Otherwise use stored value
    return dayMetrics.recoveryScore || 0;
  };

  // Calculate activity score based on steps and calories (50% weight each)
  const calculateActivityScore = (steps: number | null, calories: number | null): number => {
    let stepsScore = 50; // Default if no steps data
    let caloriesScore = 50; // Default if no calories data
    
    // Calculate steps component (50% weight)
    if (steps !== null && steps !== undefined) {
      if (steps < 3000) {
        stepsScore = 100;
      } else if (steps > 12000) {
        stepsScore = 50;
      } else {
        stepsScore = 100 - ((steps - 3000) / 9000) * 50;
      }
    }
    
    // Calculate calories component (50% weight)
    if (calories !== null && calories !== undefined) {
      if (calories < 200) {
        caloriesScore = 100;
      } else if (calories > 800) {
        caloriesScore = 50;
      } else {
        caloriesScore = 100 - ((calories - 200) / 600) * 50;
      }
    }
    
    // Final score: 50% steps + 50% calories
    const finalScore = (stepsScore * 0.5) + (caloriesScore * 0.5);
    return Math.round(finalScore);
  };

  // Get activity level status based on activity score
  const getActivityLevelStatus = (activityScore: number): string => {
    if (activityScore >= 90) {
      return "Light (rest day)";
    } else if (activityScore >= 70) {
      return "Moderate";
    } else if (activityScore >= 50) {
      return "High strain";
    } else {
      return "Very intense";
    }
  };

  // Use the specific date's metrics - prioritize selectedDateMetrics for accuracy
  const dateString = selectedDate.toISOString().split('T')[0];
  // Use fast fallback to metrics array while specific date loads, prevent flicker with smart fallback
  const fallbackMetrics = metrics.find(m => m.date === dateString);
  const currentDayMetrics = selectedDateMetrics || fallbackMetrics;
  
  // Helper function to find most recent available data for a specific field
  const getMostRecentValue = (fieldName: string, currentMetrics?: any) => {
    // If current day has data, use it
    if (currentMetrics && currentMetrics[fieldName] !== null && currentMetrics[fieldName] !== undefined) {
      return { value: currentMetrics[fieldName], isFallback: false, fallbackDate: null };
    }
    
    // Otherwise, find most recent available data from previous days
    const sortedMetrics = metrics
      .filter(m => new Date(m.date) <= selectedDate && m[fieldName] !== null && m[fieldName] !== undefined)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (sortedMetrics.length > 0) {
      const mostRecent = sortedMetrics[0];
      return { 
        value: mostRecent[fieldName], 
        isFallback: true, 
        fallbackDate: new Date(mostRecent.date).toLocaleDateString() 
      };
    }
    
    return { value: null, isFallback: false, fallbackDate: null };
  };

  const latestMetrics = currentDayMetrics || metrics[0];

  // Fetch personalized aging analysis
  const { data: agingAnalysis } = useQuery({
    queryKey: ['/api/aging-analysis'],
    retry: false,
  });

  // Fetch manual heart rate data for the selected date
  const { data: manualHeartRateData } = useQuery({
    queryKey: ['/api/manual-heart-rate', dateString],
  });

  // Helper functions to get manual heart rate data with fallback to "No Data"
  const getManualRHR = (): string => {
    if (manualHeartRateData?.restingHR && manualHeartRateData.restingHR > 0) {
      return `${manualHeartRateData.restingHR} bpm`;
    }
    return 'No Data';
  };

  const getManualHRV = (): string => {
    if (manualHeartRateData?.hrv && manualHeartRateData.hrv > 0) {
      return `${manualHeartRateData.hrv} ms`;
    }
    return 'No Data';
  };

  const getManualAvgHR = (): string => {
    if (manualHeartRateData?.avgHRAwake && manualHeartRateData.avgHRAwake > 0) {
      return `${manualHeartRateData.avgHRAwake} bpm`;
    }
    return 'No Data';
  };

  const getManualMaxHR = (): string => {
    if (manualHeartRateData?.maxHR && manualHeartRateData.maxHR > 0) {
      return `${manualHeartRateData.maxHR} bpm`;
    }
    return 'No Data';
  };

  // Helper function to get manual calories with priority
  const getManualCalories = (): number | null => {
    if (manualHeartRateData?.calories && manualHeartRateData.calories > 0) {
      return manualHeartRateData.calories;
    }
    return null;
  };

  // Helper function to determine which recovery formula is being used
  const getRecoveryFormulaType = (): 'primary' | 'fallback' => {
    // Check if we have manual HRV or stored HRV data
    const hasHRV = (manualHeartRateData?.hrv && manualHeartRateData.hrv > 0) || 
                   (latestMetrics?.heartRateVariability && latestMetrics.heartRateVariability > 0);
    
    return hasHRV ? 'primary' : 'fallback';
  };

  // Helper function to get recovery score with formula indicator
  const getRecoveryScoreWithIndicator = (): { score: string; formula: string } => {
    // Use the existing getRecoveryScore function that handles fallback logic
    const recoveryValue = getRecoveryScore(latestMetrics);
    const score = recoveryValue > 0 ? `${recoveryValue}%` : 'No Data';
    const formulaType = getRecoveryFormulaType();
    const formula = formulaType === 'primary' ? '(Primary)' : '(Fallback)';
    
    return { score, formula };
  };

  // Helper function to get weekly trend data with fallback logic
  const getWeeklyTrendData = (fieldName: string): number[] => {
    if (!metrics || metrics.length === 0) return [];
    
    const last7Days = metrics.slice(0, 7).reverse(); // Get last 7 days, chronologically
    const trendData: number[] = [];
    let lastValue: number | null = null;
    
    // Process each day, using fallback logic for missing data
    for (const dayMetrics of last7Days) {
      const value = (dayMetrics as any)?.[fieldName];
      
      if (value !== undefined && value !== null) {
        lastValue = value;
        trendData.push(lastValue);
      } else if (lastValue !== null) {
        // Use last known value as fallback for missing readings
        trendData.push(lastValue);
      }
    }
    
    return trendData;
  };

  // Helper function to get weekly HRV trend data from manual heart rate data
  const getWeeklyHRVTrendData = (): number[] => {
    if (!allManualHeartRateData || allManualHeartRateData.length === 0) return [];
    
    // Get current date and calculate the last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // Last 7 days including today
    
    // Create array of the last 7 days
    const last7Days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      last7Days.push(date);
    }
    
    // Extract HRV values for each day
    const trendData: number[] = [];
    for (const day of last7Days) {
      const dayString = day.toISOString().split('T')[0];
      const dayData = allManualHeartRateData.find((data: any) => 
        data.date.split('T')[0] === dayString
      );
      
      if (dayData?.hrv && dayData.hrv > 0) {
        trendData.push(dayData.hrv);
      }
    }
    
    return trendData;
  };

  // Helper function to generate SVG path for trend line
  const generateTrendPath = (data: number[], viewBoxWidth: number = 200, viewBoxHeight: number = 32): string => {
    if (data.length < 2) return '';
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * viewBoxWidth;
      const y = viewBoxHeight - ((value - min) / range) * (viewBoxHeight - 4) - 2; // 2px margin
      return `${x},${y}`;
    });
    
    return `M ${points[0]} L ${points.slice(1).join(' L ')}`;
  };
  
  // Scientific metabolic age calculation based on multiple biomarkers
  const calculateScientificMetabolicAge = (metrics: any) => {
    if (!metrics) return null;
    
    // Use user's actual age from birthdate, with fallback to 30
    const baseAge = userProfile ? calculateAge(userProfile.dateOfBirth) : 30;
    let metabolicAge = baseAge;
    
    // HRV impact (optimal: 45+)
    if (metrics.heartRateVariability) {
      const hrv = metrics.heartRateVariability;
      if (hrv < 30) {
        metabolicAge += 5;
      } else if (hrv < 40) {
        metabolicAge += 3;
      } else if (hrv < 45) {
        metabolicAge += 1;
      } else if (hrv >= 50) {
        metabolicAge -= 2;
      }
    }
    
    // Recovery score impact (optimal: 75+)
    if (metrics.recoveryScore) {
      const recovery = metrics.recoveryScore;
      if (recovery < 50) {
        metabolicAge += 4;
        console.log(`Recovery ${recovery} < 50: +4 years`);
      } else if (recovery < 65) {
        metabolicAge += 2;
        console.log(`Recovery ${recovery} < 65: +2 years`);
      } else if (recovery >= 80) {
        metabolicAge -= 2;
        console.log(`Recovery ${recovery} >= 80: -2 years`);
      } else {
        console.log(`Recovery ${recovery} is moderate (65-79): no change`);
      }
    }
    
    // Sleep score impact (optimal: 75+)
    if (metrics.sleepScore) {
      const sleep = metrics.sleepScore;
      if (sleep < 40) {
        metabolicAge += 3.25;
        console.log(`Sleep ${sleep} < 40: +3.25 years`);
      } else if (sleep < 60) {
        metabolicAge += 1.5;
        console.log(`Sleep ${sleep} < 60: +1.5 years`);
      } else if (sleep >= 80) {
        metabolicAge -= 0.75;
        console.log(`Sleep ${sleep} >= 80: -0.75 years`);
      } else {
        console.log(`Sleep ${sleep} is moderate (60-79): no change`);
      }
    }
    
    // VO2 Max impact (optimal for 50yr old: 40+)
    if (metrics.vo2Max) {
      const vo2 = metrics.vo2Max;
      if (vo2 < 30) {
        metabolicAge += 5;
        console.log(`VO2 Max ${vo2} < 30: +5 years`);
      } else if (vo2 < 35) {
        metabolicAge += 3;
        console.log(`VO2 Max ${vo2} < 35: +3 years`);
      } else if (vo2 < 40) {
        metabolicAge += 1;
        console.log(`VO2 Max ${vo2} < 40: +1 year`);
      } else if (vo2 >= 45) {
        metabolicAge -= 3;
        console.log(`VO2 Max ${vo2} >= 45: -3 years`);
      } else {
        console.log(`VO2 Max ${vo2} is moderate (40-44): no change`);
      }
    }
    
    // Body fat percentage impact (optimal for men 50yr: 15-20%)
    if (metrics.bodyFatPercentage) {
      const bf = metrics.bodyFatPercentage;
      if (bf > 30) {
        metabolicAge += 4.5;
        console.log(`Body Fat ${bf}% > 30: +4.5 years`);
      } else if (bf > 25) {
        metabolicAge += 2.25;
        console.log(`Body Fat ${bf}% > 25: +2.25 years`);
      } else if (bf < 15) {
        metabolicAge -= 1.75;
        console.log(`Body Fat ${bf}% < 15: -1.75 years`);
      } else {
        console.log(`Body Fat ${bf}% is optimal (15-25): no change`);
      }
    }
    
    // Resting heart rate impact (optimal: 50-65)
    if (metrics.restingHeartRate) {
      const rhr = metrics.restingHeartRate;
      if (rhr > 75) {
        metabolicAge += 2;
        console.log(`RHR ${rhr} > 75: +2 years`);
      } else if (rhr > 65) {
        metabolicAge += 1;
        console.log(`RHR ${rhr} > 65: +1 year`);
      } else if (rhr < 55) {
        metabolicAge -= 1;
        console.log(`RHR ${rhr} < 55: -1 year`);
      } else {
        console.log(`RHR ${rhr} is optimal (55-65): no change`);
      }
    }
    
    const finalAge = Math.max(25, Math.min(80, Math.round(metabolicAge)));
    console.log(`Final calculated metabolic age: ${finalAge}`);
    return finalAge;
  };
  
  // Helper function to generate AI coaching message
  const getAICoachingMessage = () => {
    if (isLoadingInsights) {
      return "Analyzing your health data...";
    }
    
    // Use new simplified AI insights format
    if (aiInsights && aiInsights.insights) {
      const insights = aiInsights.insights;
      // Return the full recommendation if available
      if (insights.recommendation) {
        return insights.recommendation;
      }
      // Fallback to daily focus if no recommendation
      return insights.dailyFocus || "Focus on maintaining healthy habits today";
    }
    
    // Fallback to basic message if no AI insights
    if (latestMetrics && latestMetrics.steps) {
      return `${formatSelectedDate(selectedDate)}, you walked ${latestMetrics.steps.toLocaleString()} steps and burned ${latestMetrics.caloriesBurned?.toLocaleString() || '0'} calories`;
    }
    
    return "Import Health Connect data to get personalized AI coaching and insights";
  };

  // Debug: Date selection is working correctly





  // Function to overlay health data for specified time period
  const overlayHealthData = async (startDateTime: Date, endDateTime: Date) => {
    try {
      const response = await fetch(`/api/health-data-points?dataType=heart_rate&startTime=${startDateTime.toISOString()}&endTime=${endDateTime.toISOString()}`);
      const heartRateData = await response.json();
      
      if (heartRateData && heartRateData.length > 0) {
        const heartRates = heartRateData.map((point: any) => point.value).filter((hr: number) => hr > 0);
        if (heartRates.length > 0) {
          const avgHeartRate = Math.round(heartRates.reduce((sum: number, hr: number) => sum + hr, 0) / heartRates.length);
          const maxHeartRate = Math.max(...heartRates);
          
          return {
            averageHeartRate: avgHeartRate,
            maxHeartRate: maxHeartRate,
            heartRateData: heartRateData
          };
        }
      }
    } catch (error) {
      console.error('Error fetching health data overlay:', error);
    }
    return null;
  };

  // Handle activity form submission with automatic estimation
  const submitActivity = useMutation({
    mutationFn: async (activityData: any) => {
      let enrichedActivity = { ...activityData };
      
      // Calculate duration if start and end times are provided
      if (activityData.startTime && activityData.endTime) {
        const startDateTime = new Date(`${activityData.date}T${activityData.startTime}`);
        const endDateTime = new Date(`${activityData.date}T${activityData.endTime}`);
        const durationMinutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));
        
        // Duration is calculated from startTime and endTime, not stored separately
        
        // Overlay health data
        const healthOverlay = await overlayHealthData(startDateTime, endDateTime);
        if (healthOverlay) {
          enrichedActivity = {
            ...enrichedActivity,
            averageHeartRate: healthOverlay.averageHeartRate,
            maxHeartRate: healthOverlay.maxHeartRate,
            enrichedWithHealthData: true
          };
        }

        // Auto-estimate missing fields using AI if we have the essential data
        if (!activityData.calories || !activityData.distance || !activityData.strain) {
          try {
            const estimationPrompt = `
              Estimate activity metrics for:
              - Activity: ${activityData.name} (${activityData.type})
              - Duration: ${durationMinutes} minutes
              ${healthOverlay ? `- Average Heart Rate: ${healthOverlay.averageHeartRate} BPM` : ''}
              ${healthOverlay ? `- Max Heart Rate: ${healthOverlay.maxHeartRate} BPM` : ''}
              - User Profile: Adult, fitness tracking context

              Provide realistic estimates for:
              1. Calories burned
              2. Distance covered (if applicable, 0 if stationary activity)

              Respond with JSON format:
              {
                "calories": number,
                "distance": number
              }
              
              Note: Strain will be calculated automatically based on activity metrics.
            `;

            const estimateResponse = await fetch('/api/ai/estimate-activity', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: estimationPrompt })
            });

            if (estimateResponse.ok) {
              const estimates = await estimateResponse.json();
              if (!activityData.calories && estimates.calories) {
                enrichedActivity.calories = estimates.calories.toString();
              }
              if (!activityData.distance && estimates.distance) {
                enrichedActivity.distance = estimates.distance.toString();
              }
              // Strain is now calculated automatically on the backend, no need to set from AI estimates
            }
          } catch (error) {
            console.log('AI estimation failed, proceeding without estimates');
          }
        }
      }
      
      // Debug the data being sent
      console.log('Submitting activity data:', enrichedActivity);
      
      const method = editingActivity ? 'PUT' : 'POST';
      const url = editingActivity ? `/api/activities/${editingActivity.id}` : '/api/activities';
      return await apiRequest(method, url, enrichedActivity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      const action = editingActivity ? 'updated' : 'logged';
      toast({
        title: `Activity ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        description: `Your activity has been saved successfully!`,
      });
      // Reset form and editing state
      setActivityForm({
        name: '',
        date: selectedDate.toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        distance: '',
        calories: '',
        notes: ''
      });
      setEditingActivity(null);
      setActiveTab('activity-log');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to log activity. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleActivitySubmit = () => {
    if (!activityForm.name || !activityForm.startTime || !activityForm.endTime) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in activity name, start time, and end time.',
        variant: 'destructive'
      });
      return;
    }

    // Prevent multiple submissions
    if (submitActivity.isPending) {
      return;
    }

    // Debug log to see what's being submitted
    console.log('Submitting activity data:', JSON.stringify(activityForm, null, 2));

    // Use AI estimation if calories/distance are empty (only for new activities, not updates)
    let submissionData = { ...activityForm };
    
    if (!editingActivity && (!submissionData.calories || submissionData.calories === '') && submissionData.name && submissionData.startTime && submissionData.endTime) {
      // Calculate duration for AI estimation
      const start = new Date(`2000-01-01T${submissionData.startTime}:00`);
      const end = new Date(`2000-01-01T${submissionData.endTime}:00`);
      const durationMinutes = Math.abs(end.getTime() - start.getTime()) / (1000 * 60);
      
      // Request AI estimation
      const estimationPrompt = `Estimate calories and distance for a ${durationMinutes}-minute ${submissionData.name.toLowerCase()} activity for an average 70kg adult. Be realistic - intense racquet sports like padel burn 400-600 cal/hour, running burns ~100 cal/mile, moderate activities 250-400 cal/hour. For ${durationMinutes} minutes of ${submissionData.name.toLowerCase()}, what are realistic calories, distance (km, null if not applicable), strain (0-21), and brief notes? Respond in JSON format.`;
      
      toast({
        title: 'Getting AI Estimation...',
        description: `Calculating realistic values for ${submissionData.name}`,
      });
      
      // Make AI estimation request
      fetch('/api/ai/estimate-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: estimationPrompt })
      })
      .then(response => response.json())
      .then(estimates => {
        if (estimates.calories) {
          submissionData.calories = estimates.calories.toString();
        }
        if (estimates.distance && (!submissionData.distance || submissionData.distance === '')) {
          submissionData.distance = estimates.distance.toString();
        }
        
        toast({
          title: 'AI Estimation Complete',
          description: `Estimated ${estimates.calories} calories for ${submissionData.name}`,
        });
        
        submitActivity.mutate(submissionData);
      })
      .catch(() => {
        // Fallback to realistic estimation based on duration if AI fails
        const fallbackCalories = getRealisticCalories(submissionData.name, durationMinutes);
        submissionData.calories = fallbackCalories.toString();
        
        toast({
          title: 'Using Fallback Estimation',
          description: `AI estimation failed, using realistic ${fallbackCalories} calories`,
          variant: 'destructive'
        });
        
        submitActivity.mutate(submissionData);
      });
      
      return; // Don't submit immediately, wait for AI estimation
    }

    submitActivity.mutate(submissionData);
  };

  // Helper function to calculate realistic calories based on activity and duration
  const getRealisticCalories = (activityType: string, durationMinutes: number) => {
    const hours = durationMinutes / 60;
    
    switch (activityType.toLowerCase()) {
      case 'running':
        return Math.round(500 * hours); // ~500 cal/hour
      case 'hiking':
        return Math.round(400 * hours); // ~400 cal/hour
      case 'swimming':
        return Math.round(450 * hours); // ~450 cal/hour
      case 'lifting':
        return Math.round(300 * hours); // ~300 cal/hour
      case 'skiing':
        return Math.round(600 * hours); // ~600 cal/hour
      case 'soccer':
        return Math.round(550 * hours); // ~550 cal/hour
      case 'pickleball':
        return Math.round(400 * hours); // ~400 cal/hour
      case 'padel':
        return Math.round(500 * hours); // ~500 cal/hour (intense racquet sport)
      default:
        return Math.round(350 * hours); // ~350 cal/hour default
    }
  };

  // Helper function to get basic activity defaults (fallback only)
  const getSmartDefaults = (activityType: string) => {
    switch (activityType.toLowerCase()) {
      case 'running':
        return { duration: 30, calories: null, distance: null }; // Let AI estimate
      case 'hiking':
        return { duration: 120, calories: null, distance: null };
      case 'swimming':
        return { duration: 45, calories: null, distance: null };
      case 'lifting':
        return { duration: 60, calories: null, distance: null };
      case 'skiing':
        return { duration: 180, calories: null, distance: null };
      case 'soccer':
        return { duration: 90, calories: null, distance: null };
      case 'pickleball':
        return { duration: 60, calories: null, distance: null };
      case 'padel':
        return { duration: 60, calories: null, distance: null };
      default:
        return { duration: 60, calories: null, distance: null };
    }
  };

  const selectActivityType = (type: string, emoji: string) => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Set reasonable defaults based on activity type
    const getActivityDefaults = (activityType: string) => {
      const defaults = {
        duration: 60, // 1 hour default
        calories: 400,
        distance: null as number | null
      };

      switch (activityType.toLowerCase()) {
        case 'running':
          return { duration: 30, calories: 350, distance: 5.0 };
        case 'hiking':
          return { duration: 120, calories: 600, distance: 8.0 };
        case 'swimming':
          return { duration: 45, calories: 450, distance: 2.0 };
        case 'cycling':
          return { duration: 60, calories: 500, distance: 20.0 };
        case 'lifting':
          return { duration: 60, calories: 300, distance: null };
        case 'skiing':
          return { duration: 180, calories: 700, distance: 15.0 };
        case 'soccer':
          return { duration: 90, calories: 600, distance: 8.0 };
        case 'pickleball':
          return { duration: 60, calories: 350, distance: null };
        case 'padel':
          return { duration: 60, calories: 400, distance: null };
        default:
          return defaults;
      }
    };

    const activityDefaults = getActivityDefaults(type);
    const endTime = new Date(now.getTime() + activityDefaults.duration * 60 * 1000);
    const endTimeString = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

    setActivityForm(prev => ({
      ...prev,
      type,
      name: type,
      startTime: prev.startTime || currentTime,
      endTime: prev.endTime || endTimeString,
      // Leave calories and distance empty - will be estimated by AI when submitted
      calories: '',
      distance: '',
      notes: `${emoji} ${type} session`
    }));

    // Show a toast to let user know defaults were set
    toast({
      title: `${emoji} ${type} Selected`,
      description: 'Duration set! Calories will be estimated by AI when logged.',
      variant: 'default'
    });
  };

  // Quick log function that immediately saves an activity with defaults
  const quickLogActivity = (type: string, emoji: string) => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const getActivityDefaults = (activityType: string) => {
      switch (activityType.toLowerCase()) {
        case 'running':
          return { duration: 30, calories: 350, distance: 5.0 };
        case 'hiking':
          return { duration: 120, calories: 600, distance: 8.0 };
        case 'swimming':
          return { duration: 45, calories: 450, distance: 2.0 };
        case 'lifting':
          return { duration: 60, calories: 300, distance: null };
        case 'skiing':
          return { duration: 180, calories: 700, distance: 15.0 };
        case 'soccer':
          return { duration: 90, calories: 600, distance: 8.0 };
        case 'pickleball':
          return { duration: 60, calories: 350, distance: null };
        case 'padel':
          return { duration: 60, calories: 400, distance: null };
        default:
          return { duration: 60, calories: 400, distance: null };
      }
    };

    const activityDefaults = getActivityDefaults(type);
    const endTime = new Date(now.getTime() + activityDefaults.duration * 60 * 1000);
    const endTimeString = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

    const quickActivityData = {
      name: type,
      type,
      startTime: currentTime,
      endTime: endTimeString,
      calories: '', // Let AI estimate
      distance: '', // Let AI estimate
      notes: `${emoji} ${type} session`
    };

    submitActivity.mutate(quickActivityData);
    
    toast({
      title: `${emoji} ${type} Logging...`,
      description: `AI will estimate calories and distance for ${activityDefaults.duration}min activity`,
      variant: 'default'
    });
  };



  // Process sleep stage data into display format
  const processSleepStageData = (stageData: any[]) => {
    if (!stageData || stageData.length === 0) {
      return [];
    }

    // Group by stage type and calculate durations
    const stageGroups = stageData.reduce((acc: any, point: any) => {
      const metadata = point.metadata || {};
      const stageCode = parseInt(metadata.stage || '0');
      let stageName = 'Unknown';
      let stageColor = '#6B7280';

      // Map Health Connect stage codes to display names
      switch (stageCode) {
        case 1: // Awake
          stageName = 'Awake';
          stageColor = '#EF4444';
          break;
        case 4: // Light sleep
          stageName = 'Light';
          stageColor = '#60A5FA';
          break;
        case 5: // Deep sleep
          stageName = 'Deep';
          stageColor = '#2563EB';
          break;
        case 6: // REM sleep
          stageName = 'REM';
          stageColor = '#8B5CF6';
          break;
        default:
          return acc; // Skip unknown stages
      }

      if (!acc[stageName]) {
        acc[stageName] = {
          name: stageName,
          duration: 0,
          color: stageColor,
          percentage: 0
        };
      }

      // Calculate duration from start and end times
      const startTime = new Date(point.startTime);
      const endTime = new Date(point.endTime || point.startTime);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      acc[stageName].duration += durationMinutes;
      return acc;
    }, {});

    const stages = Object.values(stageGroups) as any[];
    const totalSleepMinutes = stages.reduce((sum: number, stage: any) => sum + stage.duration, 0);

    // Calculate percentages
    stages.forEach((stage: any) => {
      stage.percentage = totalSleepMinutes > 0 ? (stage.duration / totalSleepMinutes) * 100 : 0;
    });

    return stages.filter(stage => stage.duration > 0);
  };

  const formatSleepDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  // Calculate sleep quality metrics from real data
  const calculateSleepMetrics = (stageData: any[], sleepDuration?: number) => {
    if (!stageData || stageData.length === 0) {
      return {
        sleepEfficiency: null,
        bedtime: null,
        wakeTime: null,
        awakenings: null,
        totalTimeInBed: null,
        actualSleepTime: null,
        totalTimeAwake: null,
        sleepLatency: null,
        sleepFragmentation: null
      };
    }

    // Sort stages by start time to get chronological order
    const sortedStages = [...stageData].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const firstStage = sortedStages[0];
    const lastStage = sortedStages[sortedStages.length - 1];
    
    // Calculate bedtime and wake time
    const bedtime = new Date(firstStage.startTime);
    const wakeTime = new Date(lastStage.endTime || lastStage.startTime);
    
    // Calculate actual sleep time (exclude awake periods)
    const sleepStages = stageData.filter(stage => {
      const metadata = stage.metadata || {};
      return parseInt(metadata.stage || '0') !== 1; // Not awake
    });
    
    const actualSleepTime = sleepStages.reduce((total, stage) => {
      const startTime = new Date(stage.startTime);
      const endTime = new Date(stage.endTime || stage.startTime);
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      return total + duration;
    }, 0);
    
    // Calculate total time awake (minutes)
    const awakeStages = stageData.filter(stage => {
      const metadata = stage.metadata || {};
      return parseInt(metadata.stage || '0') === 1; // Awake
    });
    
    const totalTimeAwake = awakeStages.reduce((total, stage) => {
      const startTime = new Date(stage.startTime);
      const endTime = new Date(stage.endTime || stage.startTime);
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      return total + duration;
    }, 0);
    
    // Calculate total time in bed - use the sum of all stages (more accurate than just first to last)
    const totalStageTime = actualSleepTime + totalTimeAwake;
    
    // If we have sleepDuration from health metrics and it's larger, use it as fallback for time in bed
    // This handles cases where stage data might be incomplete
    let totalTimeInBed = totalStageTime;
    if (sleepDuration && sleepDuration > totalStageTime) {
      totalTimeInBed = sleepDuration;
    } else if (totalStageTime === 0) {
      // Fallback: calculate from first to last stage if individual stage durations are missing
      totalTimeInBed = Math.round((wakeTime.getTime() - bedtime.getTime()) / (1000 * 60));
    }
    
    // Calculate sleep efficiency: (actual sleep time / time in bed) * 100
    // Ensure it never goes above 100% due to data inconsistencies
    let sleepEfficiency = null;
    if (totalTimeInBed > 0 && actualSleepTime > 0) {
      sleepEfficiency = Math.min(100, Math.round((actualSleepTime / totalTimeInBed) * 100));
    }
    
    // Count awakenings (number of separate awake periods)
    const awakenings = awakeStages.length;
    
    // Calculate sleep latency (time to first sleep stage after bedtime)
    let sleepLatency = null;
    if (sortedStages.length > 1) {
      // Find first non-awake stage after bedtime
      const firstSleepStage = sortedStages.find(stage => {
        const metadata = stage.metadata || {};
        return parseInt(metadata.stage || '0') !== 1; // Not awake
      });
      
      if (firstSleepStage) {
        const latencyMs = new Date(firstSleepStage.startTime).getTime() - bedtime.getTime();
        sleepLatency = Math.round(latencyMs / (1000 * 60)); // Convert to minutes
      }
    }
    
    // Calculate sleep fragmentation based on number of stage transitions
    let sleepFragmentation = 'Unknown';
    if (sortedStages.length > 0) {
      const transitionsPerHour = (sortedStages.length / (totalTimeInBed / 60)) || 0;
      if (transitionsPerHour < 3) {
        sleepFragmentation = 'Low';
      } else if (transitionsPerHour < 6) {
        sleepFragmentation = 'Moderate';
      } else {
        sleepFragmentation = 'High';
      }
    }
    
    return {
      sleepEfficiency,
      bedtime: bedtime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      wakeTime: wakeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      awakenings,
      totalTimeInBed,
      actualSleepTime,
      totalTimeAwake,
      sleepLatency,
      sleepFragmentation
    };
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("POST", "/api/ai/chat", { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      setChatMessage("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message to AI coach.",
      });
    },
  });

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      sendMessageMutation.mutate(chatMessage);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="bg-black min-h-screen px-4 pt-6 pb-24">
            {/* Date Header with Navigation */}
            <TabHeader title="Dashboard" />

            {/* AI Coaching Insight */}
            <WhoopStyleAICoaching 
              message={getAICoachingMessage()}
              recoveryScore={getRecoveryScore(latestMetrics)}
              heartRateVariability={latestMetrics?.heartRateVariability || undefined}
              stressLevel={latestMetrics?.stressLevel || undefined}
              onClick={() => setActiveTab("coach")}
            />

            {/* Three Hero Circles - Whoop Style */}
            <div className="flex justify-center items-center space-x-10 mb-8">
              {/* Steps Circle */}
              <button onClick={() => setActiveTab("activity")} className="focus:outline-none">
                <WhoopStyleCircularMetric
                  value={latestMetrics?.steps?.toLocaleString() || "0"}
                  label="Steps"
                  percentage={Math.min((latestMetrics?.steps || 0) / 10000 * 100, 100)} // Show progress to 10k steps
                  color="blue"
                  size="large"
                  trend={latestMetrics?.steps && latestMetrics.steps > 5000 ? "up" : "stable"}
                />
              </button>
              
              {/* Calories Circle */}
              <button onClick={() => setActiveTab("strain")} className="focus:outline-none">
                <WhoopStyleCircularMetric
                  value={(() => {
                    // Priority: Manual calories from Settings tab
                    const manualCalories = getManualCalories();
                    const bmr = latestMetrics?.bmr;
                    
                    if (manualCalories && bmr) {
                      return (manualCalories + bmr).toLocaleString();
                    }
                    
                    // Fallback: Device active calories + BMR
                    const activeCalories = latestMetrics?.activeCalories || 0;
                    // Only show calories if we have real BMR data - no fake fallbacks
                    return bmr ? (activeCalories + bmr).toLocaleString() : "No Data";
                  })()}
                  label="Calories"
                  percentage={(() => {
                    // Priority: Manual calories from Settings tab
                    const manualCalories = getManualCalories();
                    const bmr = latestMetrics?.bmr;
                    
                    if (manualCalories && bmr) {
                      return Math.min((manualCalories + bmr) / 2500 * 100, 100);
                    }
                    
                    // Fallback: Device active calories + BMR
                    const activeCalories = latestMetrics?.activeCalories || 0;
                    return bmr ? Math.min((activeCalories + bmr) / 2500 * 100, 100) : 0;
                  })()}
                  color="orange"
                  size="large"
                  trend={(() => {
                    // Priority: Manual calories from Settings tab
                    const manualCalories = getManualCalories();
                    const bmr = latestMetrics?.bmr;
                    
                    if (manualCalories && bmr) {
                      return (manualCalories + bmr) > 2000 ? "up" : "stable";
                    }
                    
                    // Fallback: Device calories + BMR
                    const caloriesBurned = latestMetrics?.caloriesBurned || 0;
                    return bmr && (caloriesBurned + bmr) > 2000 ? "up" : "stable";
                  })()}
                />
              </button>
            </div>

            {/* Sleep and Metabolic Age Circles - Two below */}
            <div className="flex justify-center items-center space-x-10 mb-8">
              <button onClick={() => setActiveTab("sleep")} className="focus:outline-none">
                <WhoopStyleCircularMetric
                  value={latestMetrics?.sleepScore ? `${latestMetrics.sleepScore}%` : "No Data"}
                  label="Sleep"
                  percentage={latestMetrics?.sleepScore || 0}
                  color="green"
                  size="large"
                  subtitle={latestMetrics?.sleepDuration ? `${Math.floor(latestMetrics.sleepDuration / 60)}h ${latestMetrics.sleepDuration % 60}m` : "Missing"}
                  trend={latestMetrics?.sleepScore ? "up" : undefined}
                />
              </button>

              <button onClick={() => setActiveTab("metabolic")} className="focus:outline-none">
                <WhoopStyleCircularMetric
                  value={(() => {
                    const calculatedAge = calculateScientificMetabolicAge(latestMetrics);
                    return calculatedAge ? Math.round(calculatedAge).toString() : "No Data";
                  })()}
                  label="Metabolic Age"
                  percentage={(() => {
                    const calculatedAge = calculateScientificMetabolicAge(latestMetrics);
                    if (!calculatedAge) return 0;
                    const userAge = userProfile ? calculateAge(userProfile.dateOfBirth) : 30;
                    const targetAge = userAge - 5; // Target: 5 years younger
                    const maxAge = userAge + 15; // Worst case scenario
                    
                    if (calculatedAge <= targetAge) return 100; // Achieved goal or better
                    return Math.max(0, (maxAge - calculatedAge) / (maxAge - targetAge) * 100);
                  })()}
                  color="purple"
                  size="large"
                  subtitle={(() => {
                    const calculatedAge = calculateScientificMetabolicAge(latestMetrics);
                    return calculatedAge ? "Calculated" : "Missing";
                  })()}
                  trend={(() => {
                    const calculatedAge = calculateScientificMetabolicAge(latestMetrics);
                    const userAge = userProfile ? calculateAge(userProfile.dateOfBirth) : 30;
                    return calculatedAge && calculatedAge < userAge ? "down" : undefined;
                  })()}
                />
              </button>
            </div>

            {/* Quick Metrics Row with Mini Charts */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-green-400 text-lg">⚡</span>
                    <span className="text-white font-medium">
                      HRV: {getManualHRV()}
                    </span>
                  </div>
                  {(() => {
                    const weeklyHRV = getWeeklyHRVTrendData();
                    return weeklyHRV.length >= 2 ? (
                      <MiniTrendChart 
                        data={weeklyHRV} 
                        color="#00D570" 
                        width={60}
                        height={20}
                      />
                    ) : (
                      <div className="text-gray-500 text-xs">Need more data</div>
                    );
                  })()}
                </div>
              </div>
              
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-red-400 text-lg">❤️</span>
                    <span className="text-white font-medium">
                      RHR: {getManualRHR()}
                    </span>
                  </div>
                  {(() => {
                    const weeklyRHR = getWeeklyTrendData('restingHeartRate');
                    return weeklyRHR.length >= 2 ? (
                      <MiniTrendChart 
                        data={weeklyRHR} 
                        color="#FF6B6B" 
                        width={60}
                        height={20}
                      />
                    ) : (
                      <div className="text-gray-500 text-xs">Need more data</div>
                    );
                  })()}
                </div>
              </div>
              
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-blue-400 text-lg">🛏️</span>
                    <span className="text-white font-medium">
                      Sleep: {latestMetrics?.sleepDuration ? `${Math.floor(latestMetrics.sleepDuration / 60)}h ${latestMetrics.sleepDuration % 60}m` : 'No Data'}
                    </span>
                  </div>
                  {(() => {
                    const weeklySleep = getWeeklyTrendData('sleepDuration');
                    return weeklySleep.length >= 2 ? (
                      <MiniTrendChart 
                        data={weeklySleep} 
                        color="#4A9EFF" 
                        width={60}
                        height={20}
                      />
                    ) : (
                      <div className="text-gray-500 text-xs">Need more data</div>
                    );
                  })()}
                </div>
              </div>
              
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-yellow-400 text-lg">⚖️</span>
                    <span className="text-white font-medium">
                      Weight: {latestMetrics?.weight ? `${latestMetrics.weight.toFixed(1)} lbs` : 'No Data'}
                    </span>
                  </div>
                  {(() => {
                    const weeklyWeight = getWeeklyTrendData('weight');
                    return weeklyWeight.length >= 2 ? (
                      <MiniTrendChart 
                        data={weeklyWeight} 
                        color="#FFC107" 
                        width={60}
                        height={20}
                      />
                    ) : (
                      <div className="text-gray-500 text-xs">Need more data</div>
                    );
                  })()}
                </div>
              </div>
              
              {/* Body Fat Percentage */}
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-pink-400">💪</span>
                    <span className="text-white font-medium">
                      Body Fat: {latestMetrics?.bodyFatPercentage ? `${latestMetrics.bodyFatPercentage}%` : 'No Data'}
                    </span>
                  </div>
                  {(() => {
                    const weeklyBodyFat = getWeeklyTrendData('bodyFatPercentage');
                    return weeklyBodyFat.length >= 2 ? (
                      <MiniTrendChart 
                        data={weeklyBodyFat} 
                        color="#FF69B4" 
                        width={60}
                        height={20}
                      />
                    ) : (
                      <div className="text-gray-500 text-xs">Need more data</div>
                    );
                  })()}
                </div>
              </div>
              
              {/* BMI */}
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-purple-400">📊</span>
                    <span className="text-white font-medium">
                      BMI: {latestMetrics?.bmi ? `${latestMetrics.bmi.toFixed(1)}` : 'No Data'}
                    </span>
                  </div>
                  {(() => {
                    const weeklyBMI = getWeeklyTrendData('bmi');
                    return weeklyBMI.length >= 2 ? (
                      <MiniTrendChart 
                        data={weeklyBMI} 
                        color="#9333EA" 
                        width={60}
                        height={20}
                      />
                    ) : (
                      <div className="text-gray-500 text-xs">Need more data</div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Weekly Trend Card */}
            <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-work font-semibold">Weekly Trend</h3>
                <span className="text-gray-400 text-sm">Recovery</span>
              </div>
              
              <div className="relative h-20 mb-4">
                <svg className="w-full h-full" viewBox="0 0 300 80">
                  {/* Recovery trend line using authentic data */}
                  {(() => {
                    const weeklyRecovery = getWeeklyTrendData('recoveryScore');
                    if (weeklyRecovery.length >= 2) {
                      const path = generateTrendPath(weeklyRecovery, 300, 80);
                      return (
                        <path
                          d={path}
                          fill="none"
                          stroke="rgb(34, 197, 94)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      );
                    } else {
                      // Fallback when insufficient data
                      return (
                        <text x="150" y="40" textAnchor="middle" fill="rgb(156, 163, 175)" fontSize="12">
                          Need more recovery data for trend
                        </text>
                      );
                    }
                  })()}
                </svg>
                
                {/* Week days */}
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>S</span>
                  <span>M</span>
                  <span>T</span>
                  <span>W</span>
                  <span>T</span>
                  <span>F</span>
                  <span>S</span>
                </div>
              </div>
            </div>

            {/* WHOOP-style AI Coaching */}
            <WhoopDashboardAI 
              recoveryScore={getRecoveryScore(latestMetrics)}
              sleepScore={latestMetrics?.sleepScore}
              sleepDuration={latestMetrics?.sleepDuration}
              steps={latestMetrics?.steps}
              strainScore={latestMetrics?.strainScore}
              caloriesBurned={getManualCaloriesFromSettings(userSettings) || latestMetrics?.caloriesBurned}
              heartRateVariability={latestMetrics?.heartRateVariability || undefined}
            />

            {/* My Day Section */}
            <div className="mt-8 mb-6">
              <h2 className="text-white font-work font-bold text-xl mb-4">My Day</h2>
              
              {/* Daily Outlook Card */}
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Today's Summary</h3>
                    <p className="text-gray-400 text-sm">
                      {latestMetrics ? `Steps: ${(latestMetrics.steps / 1000).toFixed(1)}k • Strain: ${latestMetrics.strainScore?.toFixed(1) || 'N/A'}` : 'No activity data'}
                    </p>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </div>
              
              {/* Today's Activities */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-work font-semibold text-lg">Today's Activities</h3>
                  <button className="w-8 h-8 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">+</span>
                  </button>
                </div>
                
                {/* Activity Cards */}
                {latestMetrics?.steps && (
                  <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <span className="text-2xl">🚶</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">Walking</h4>
                          <p className="text-gray-400 text-sm">{(latestMetrics.steps / 1000).toFixed(1)}k steps • {latestMetrics.distance?.toFixed(2)} km</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">{latestMetrics.caloriesBurned} cal</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {!latestMetrics?.steps && (
                  <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 text-center">
                    <p className="text-gray-400">No activities recorded today</p>
                    <p className="text-gray-500 text-sm mt-1">Import data to see your daily activities</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "metabolic":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <TabHeader title="Metabolic" />
            <EnhancedMetabolicTab 
              onNavigate={(tab: string) => setActiveTab(tab as TabType)} 
              metabolicPeriod={metabolicPeriod}
              onPeriodChange={setMetabolicPeriod}
              metrics={{
                ...latestMetrics,
                age: userProfile ? calculateAge(userProfile.dateOfBirth) : calculateAge(null), // User's actual age from birthdate or default May 4, 1975
                metabolicAge: calculateScientificMetabolicAge(latestMetrics), // Use calculated metabolic age
                muscleMass: latestMetrics?.muscleMass || null // Will show No Data if null from database
              }}
            />
          </div>
        );

      case "recovery":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            {/* Recovery Score */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-green-400 text-lg">↗</span>
                <p className="text-green-400 font-work font-bold text-5xl">
                  {latestMetrics?.recoveryScore ? `${latestMetrics.recoveryScore}%` : 'No Data'}
                </p>
              </div>
              <p className="text-gray-400 text-sm">Recovery Score</p>
            </div>

            {/* Recovery Metrics Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 text-center">
                <p className="text-white font-work text-xs mb-1">HRV</p>
                <p className="text-white font-work font-bold text-lg">
                  {getManualHRV()}
                </p>
              </div>
              
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 text-center">
                <p className="text-white font-work text-xs mb-1">RHR</p>
                <p className="text-white font-work font-bold text-lg">
                  {getManualRHR()}
                </p>
              </div>
              
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 text-center">
                <p className="text-white font-work text-xs mb-1">Weight</p>
                <p className="text-white font-work font-bold text-lg">
                  {latestMetrics?.weight ? `${latestMetrics.weight.toFixed(1)} lbs` : 'No Data'}
                </p>
              </div>
            </div>

            {/* Sleep Stages */}
            <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 mb-6">
              <h3 className="text-white font-work font-bold text-lg mb-4">Sleep Stages</h3>
              <div className="flex justify-between items-end h-16 px-2">
                {['T', 'M', 'T/', 'KM', 'L', 'II', 'D', 'D'].map((day, i) => (
                  <div key={i} className="flex flex-col items-center space-y-2">
                    <div className="w-1 h-12 bg-teal-400 rounded" style={{ opacity: 0.4 + (i * 0.08) }} />
                    <span className="text-gray-400 text-xs">{day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 mb-6">
              <h3 className="text-white font-work font-bold text-lg mb-3">AI Insights</h3>
              <p className="text-white text-sm mb-2">You're trending better than 78% of users</p>
              <p className="text-gray-400 text-sm">• Consider more sleep tonight</p>
            </div>

            {/* Bottom Navigation Tabs */}
            <div className="flex justify-center space-x-6 mt-8">
              <button 
                onClick={() => setActiveTab("recovery")}
                className="text-white font-work text-sm border-b-2 border-white pb-1"
              >
                Recovery
              </button>
              <button 
                onClick={() => setActiveTab("sleep")}
                className="text-gray-400 font-work text-sm pb-1"
              >
                Sleep
              </button>
              <button 
                onClick={() => setActiveTab("strain")}
                className="text-gray-400 font-work text-sm pb-1"
              >
                Strain
              </button>
            </div>
          </div>
        );

      case "coach":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <TabHeader title="AI Coach" />
            <EnhancedAICoach onNavigate={(tab: string) => setActiveTab(tab as TabType)} />
          </div>
        );

      case "sleep":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <TabHeader title="Sleep" />
            {/* Sleep Duration Circle and Score */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex justify-center">
                <WhoopStyleCircularMetric
                  value={latestMetrics?.sleepDuration ? `${Math.floor(latestMetrics.sleepDuration / 60)}h ${latestMetrics.sleepDuration % 60}m` : "No Data"}
                  label={latestMetrics?.sleepDuration ? "hours slept" : "Import sleep data"}
                  percentage={latestMetrics?.sleepDuration ? Math.min(100, (latestMetrics.sleepDuration / 480 * 100)) : 0}
                  color="blue"
                  size="large"
                />
              </div>
              
              <div className="text-right">
                <p className="text-gray-400 uppercase tracking-wide text-sm font-medium mb-1">Sleep Score</p>
                <p className="text-white font-work font-bold text-5xl">
                  {latestMetrics?.sleepScore || "No Data"}
                </p>
              </div>
            </div>

            {/* Key Sleep Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
                <p className="text-2xl font-work font-bold text-blue-400 mb-1">
                  {latestMetrics?.sleepDuration ? `${Math.floor(latestMetrics.sleepDuration / 60)}h ${latestMetrics.sleepDuration % 60}m` : 'No Data'}
                </p>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Sleep Duration</p>
                {latestMetrics?.sleepDuration && latestMetrics?.sleepEfficiency && (
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      // Calculate time in bed from sleep duration and efficiency
                      const asleepMinutes = latestMetrics.sleepDuration;
                      const timeInBedMinutes = Math.round(asleepMinutes / (latestMetrics.sleepEfficiency / 100));
                      const timeAwakeMinutes = timeInBedMinutes - asleepMinutes;
                      
                      return `In bed: ${Math.floor(timeInBedMinutes / 60)}h ${timeInBedMinutes % 60}m • Awake: ${Math.floor(timeAwakeMinutes / 60)}h ${timeAwakeMinutes % 60}m`;
                    })()}
                  </p>
                )}
              </div>
              
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
                <p className="text-2xl font-work font-bold text-green-400 mb-1">
                  {latestMetrics?.sleepEfficiency ? `${latestMetrics.sleepEfficiency}%` : 'No Data'}
                </p>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Sleep Efficiency</p>
                {latestMetrics?.sleepEfficiency && latestMetrics?.sleepDuration && (
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.floor(latestMetrics.sleepDuration / 60)}h {latestMetrics.sleepDuration % 60}m asleep
                  </p>
                )}
              </div>
            </div>

            {/* Sleep Stages */}
            <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 mb-6">
              <h3 className="text-white font-work font-bold text-lg mb-4">Sleep Stages</h3>
              {(() => {
                // First try to use granular sleep stage data
                const processedStages = processSleepStageData(sleepStageData);
                
                // If no granular data, create stages from aggregated health metrics
                if (processedStages.length === 0 && latestMetrics && (latestMetrics.deepSleep || latestMetrics.lightSleep || latestMetrics.remSleep)) {
                  const stages = [];
                  const totalSleep = (latestMetrics.deepSleep || 0) + (latestMetrics.lightSleep || 0) + (latestMetrics.remSleep || 0);
                  
                  if (latestMetrics.deepSleep && latestMetrics.deepSleep > 0) {
                    stages.push({
                      name: 'Deep',
                      duration: latestMetrics.deepSleep,
                      color: '#2563EB',
                      percentage: (latestMetrics.deepSleep / totalSleep) * 100
                    });
                  }
                  
                  if (latestMetrics.remSleep && latestMetrics.remSleep > 0) {
                    stages.push({
                      name: 'REM',
                      duration: latestMetrics.remSleep,
                      color: '#8B5CF6',
                      percentage: (latestMetrics.remSleep / totalSleep) * 100
                    });
                  }
                  
                  if (latestMetrics.lightSleep && latestMetrics.lightSleep > 0) {
                    stages.push({
                      name: 'Light',
                      duration: latestMetrics.lightSleep,
                      color: '#60A5FA',
                      percentage: (latestMetrics.lightSleep / totalSleep) * 100
                    });
                  }
                  
                  if (stages.length > 0) {
                    return (
                      <div className="space-y-3">
                        {stages.map((stage: any) => (
                          <div key={stage.name} className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">{stage.name}</span>
                            <div className="flex-1 mx-4">
                              <div className="h-2 bg-gray-700 rounded-full">
                                <div 
                                  className="h-2 rounded-full" 
                                  style={{ 
                                    width: `${Math.max(stage.percentage, 2)}%`, // Minimum 2% for visibility
                                    backgroundColor: stage.color 
                                  }}
                                ></div>
                              </div>
                            </div>
                            <span className="text-gray-400 text-xs">
                              {formatSleepDuration(stage.duration)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                }
                
                // Show granular data if available
                if (processedStages.length > 0) {
                  return (
                    <div className="space-y-3">
                      {processedStages.map((stage: any) => (
                        <div key={stage.name} className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">{stage.name}</span>
                          <div className="flex-1 mx-4">
                            <div className="h-2 bg-gray-700 rounded-full">
                              <div 
                                className="h-2 rounded-full" 
                                style={{ 
                                  width: `${Math.max(stage.percentage, 2)}%`, // Minimum 2% for visibility
                                  backgroundColor: stage.color 
                                }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-gray-400 text-xs">
                            {formatSleepDuration(stage.duration)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                
                // No data available
                return (
                  <div className="text-center text-gray-400 py-8">
                    <p className="mb-2">No sleep stage data available</p>
                    <p className="text-sm">Import Health Connect data to see detailed sleep stages</p>
                  </div>
                );
              })()}
            </div>

            {/* Bottom Metrics Row - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6 mb-6">
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 text-center">
                <p className="text-white font-work font-bold text-lg">{getManualRHR()}</p>
                <p className="text-white font-work font-bold text-lg">{getManualHRV()}</p>
                <p className="text-gray-400 text-xs uppercase tracking-wide">RHR • HRV</p>
              </div>
              
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 text-center">
                <p className="text-white font-work font-bold text-lg">{getManualAvgHR()}</p>
                <p className="text-white font-work font-bold text-lg">{getManualMaxHR()}</p>
                <p className="text-gray-400 text-xs uppercase tracking-wide">Avg HR • Max HR</p>
              </div>
              
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 text-center">
                <p className="text-white font-work font-bold text-lg">
                  {(() => {
                    const sleepMetrics = calculateSleepMetrics(sleepStageData, latestMetrics?.sleepDuration);
                    // For now show sleep efficiency as consistency proxy until we have multi-day data
                    return sleepMetrics.sleepEfficiency ? `${sleepMetrics.sleepEfficiency}%` : 'No Data';
                  })()}
                </p>
                <p className="text-gray-400 text-xs uppercase tracking-wide">Sleep Quality</p>
                {(() => {
                  const sleepMetrics = calculateSleepMetrics(sleepStageData, latestMetrics?.sleepDuration);
                  return sleepMetrics.bedtime && (
                    <p className="text-xs text-gray-500 mt-1">Bedtime: {sleepMetrics.bedtime}</p>
                  );
                })()}
              </div>

              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 text-center">
                <p className="text-white font-work font-bold text-lg">
                  {getRecoveryScoreWithIndicator().score}
                </p>
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Recovery Score {getRecoveryScoreWithIndicator().formula}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const recoveryValue = getRecoveryScore(latestMetrics);
                    if (recoveryValue <= 0) return 'No data';
                    
                    if (recoveryValue >= 67) return 'Green (67%+)';
                    if (recoveryValue >= 34) return 'Yellow (34-66%)';
                    return 'Red (0-33%)';
                  })()}
                </p>
              </div>
            </div>

            {/* Sleep Quality Breakdown */}
            {latestMetrics?.sleepDuration && (
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 mb-6">
                <h3 className="text-white font-work font-bold text-lg mb-4">Sleep Quality Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Sleep Efficiency</span>
                      <span className="text-white text-sm">
                        {latestMetrics?.sleepEfficiency ? `${latestMetrics.sleepEfficiency}%` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Wake events</span>
                      <span className="text-white text-sm">
                        {latestMetrics?.wakeEvents !== null && latestMetrics?.wakeEvents !== undefined ? `${latestMetrics.wakeEvents} times` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Total time in bed</span>
                      <span className="text-white text-sm">
                        {(() => {
                          if (latestMetrics?.sleepDuration && latestMetrics?.sleepEfficiency) {
                            const timeInBedMinutes = Math.round(latestMetrics.sleepDuration / (latestMetrics.sleepEfficiency / 100));
                            return `${Math.floor(timeInBedMinutes / 60)}h ${timeInBedMinutes % 60}m`;
                          }
                          return 'No Data';
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Sleep latency</span>
                      <span className="text-white text-sm">
                        {(() => {
                          const sleepMetrics = calculateSleepMetrics(sleepStageData, latestMetrics?.sleepDuration);
                          return sleepMetrics.sleepLatency !== null ? `${sleepMetrics.sleepLatency}m` : 'No Data';
                        })()
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Sleep fragmentation</span>
                      <span className="text-white text-sm">
                        {(() => {
                          const sleepMetrics = calculateSleepMetrics(sleepStageData, latestMetrics?.sleepDuration);
                          return sleepMetrics.sleepFragmentation || 'No Data';
                        })()
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Total time awake</span>
                      <span className="text-white text-sm">
                        {(() => {
                          if (latestMetrics?.sleepDuration && latestMetrics?.sleepEfficiency) {
                            const timeInBedMinutes = Math.round(latestMetrics.sleepDuration / (latestMetrics.sleepEfficiency / 100));
                            const timeAwakeMinutes = timeInBedMinutes - latestMetrics.sleepDuration;
                            return `${Math.floor(timeAwakeMinutes / 60)}h ${timeAwakeMinutes % 60}m`;
                          }
                          return 'No Data';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sleep Insight */}
            <div className="bg-gradient-to-r from-[#1A1A1A] to-[#252525] rounded-2xl border border-gray-700/50 p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🌙</span>
                </div>
                <div>
                  <p className="text-white text-sm leading-relaxed">
                    {latestMetrics?.sleepDuration ? 
                      `Your sleep duration of ${Math.floor(latestMetrics.sleepDuration / 60)}h ${latestMetrics.sleepDuration % 60}m is below the recommended 7-9 hours. Consider going to bed 1-2 hours earlier to improve recovery and performance.` :
                      "Import Health Connect sleep data to receive personalized sleep insights and recommendations."
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={() => setActiveTab("sleep-details")} 
                className="w-full bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 text-white hover:bg-[var(--giddyup-secondary)]/20"
              >
                Sleep Score Details
              </Button>
              <Button 
                onClick={() => setActiveTab("sleep-debt")} 
                className="w-full bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 text-white hover:bg-[var(--giddyup-secondary)]/20"
              >
                Sleep Debt Analysis
              </Button>
            </div>
          </div>
        );

      case "strain":
        // Filter activities for the selected date
        const selectedDateString = selectedDate.toISOString().split('T')[0];
        const todaysActivities = (activities || []).filter(activity => 
          activity.startTime && activity.startTime.startsWith(selectedDateString)
        );
        
        // Get health metrics for the selected date
        const strainDateMetrics = (metrics || []).find(m => 
          new Date(m.date).toISOString().split('T')[0] === selectedDateString
        );
        
        // Prioritize activities with heart rate data, then fall back to any activity
        let latestActivity = todaysActivities.find(activity => 
          activity.averageHeartRate !== null || activity.maxHeartRate !== null
        ) || todaysActivities[0];

        // Use stored strain score from backend - no frontend calculation
        let strainScore = 0;
        
        if (strainDateMetrics && strainDateMetrics.strainScore !== null && strainDateMetrics.strainScore !== undefined) {
          strainScore = strainDateMetrics.strainScore;
        }

        // Calculate percentage of strain (0-21 scale)
        const strainPercentage = strainScore > 0 ? Math.round((strainScore / 21) * 100) : 0;

        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <TabHeader title="Strain" />
            {/* Main Strain Circle - Using strain calculation with logged activities priority */}
            <div className="flex justify-center mb-8">
              <WhoopStyleCircularMetric
                value={strainScore > 0 ? strainScore.toFixed(1) : "No Data"}
                label={strainScore > 0 ? "STRAIN" : "NO DATA"}
                percentage={Math.min((strainScore / 21) * 100, 100)} // Scale 0-21 to 0-100 for display
                color="blue"
                size="large"
                subtitle={strainScore > 0 ? `${strainPercentage}%` : "Missing"}
              />
            </div>

            {/* Activity Score and Today's Activity */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
                <p className="text-gray-400 uppercase tracking-wide text-sm font-medium mb-2">Activity Score</p>
                <div className="text-center">
                  <p className="text-white text-2xl font-bold mb-1">
                    {strainDateMetrics ? calculateActivityScore(strainDateMetrics.steps, strainDateMetrics.caloriesBurned).toString() : "No Data"}
                  </p>
                  {strainDateMetrics && (
                    <p className="text-blue-400 text-sm font-medium">
                      {getActivityLevelStatus(calculateActivityScore(strainDateMetrics.steps, strainDateMetrics.caloriesBurned))}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
                <p className="text-gray-400 uppercase tracking-wide text-sm font-medium mb-2">Latest Activity</p>
                <div className="flex items-center justify-center">
                  {latestActivity ? (
                    <div className="text-center">
                      <p className="text-white text-sm font-medium">{latestActivity.name}</p>
                      <p className="text-blue-400 text-xs">{latestActivity.type}</p>
                      {latestActivity.steps ? (
                        <p className="text-gray-400 text-xs">{latestActivity.steps.toLocaleString()} steps</p>
                      ) : latestActivity.strain ? (
                        <p className="text-gray-400 text-xs">{latestActivity.strain.toFixed(1)} strain</p>
                      ) : (
                        <p className="text-gray-400 text-xs">No strain data</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">No activity data</p>
                      <p className="text-gray-500 text-xs">Import Health Connect data</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Heart Rate Zones */}
            <HeartRateZonesContainer selectedDate={selectedDate} />

            {/* Key Metrics Grid - Heart Rate with day-level fallback */}
            <HeartRateMetricsGrid 
              latestActivity={latestActivity}
              selectedDate={selectedDate}
              selectedDateMetrics={strainDateMetrics}
            />



            {/* Motivational Message - Whoop style */}
            <div className="bg-gradient-to-r from-[#1A1A1A] to-[#252525] rounded-2xl border border-gray-700/50 p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold">💡</span>
                </div>
                <p className="text-white text-sm leading-relaxed">
                  Good work! Add more activity today to help build Strain and boost Recovery.
                </p>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="space-y-3 mt-6">
              <Button 
                onClick={() => setActiveTab("activity-log")} 
                className="w-full bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 text-white hover:bg-[var(--giddyup-secondary)]/20"
              >
                Activity Log
              </Button>
              <Button 
                onClick={() => setActiveTab("training-load")} 
                className="w-full bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 text-white hover:bg-[var(--giddyup-secondary)]/20"
              >
                Training Load Analysis
              </Button>
            </div>
          </div>
        );

      case "vitals":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <TabHeader title="Vitals" />
            <div className="text-center mb-8">
              <p className="text-gray-400">Monitor your key health indicators</p>
            </div>

            {/* Vitals Overview */}
            <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-6 mb-6">
              <h3 className="text-white font-work font-bold text-lg mb-4">Health Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-work font-bold text-white mb-1">
                    {latestMetrics?.weight ? `${latestMetrics.weight.toFixed(1)} lbs` : 'No Data'}
                  </p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Weight</p>
                  <p className="text-xs text-gray-400 mt-1">Import scale data</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-work font-bold text-yellow-400 mb-1">
                    {latestMetrics?.bmi ? latestMetrics.bmi.toFixed(1) : 'No Data'}
                  </p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">BMI</p>
                  <p className="text-xs text-green-400 mt-1">
                    {latestMetrics?.bmi ? 'Overweight' : 'Missing data'}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Vitals */}
            <div className="space-y-4 mb-6">
              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-work font-bold text-white">Blood Pressure</p>
                    <p className="text-xs text-gray-400">Systolic/Diastolic</p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      // Use fallback logic for blood pressure
                      const systolicData = getMostRecentValue('bloodPressureSystolic', currentDayMetrics);
                      const diastolicData = getMostRecentValue('bloodPressureDiastolic', currentDayMetrics);
                      
                      if (systolicData.value && diastolicData.value) {
                        return (
                          <>
                            <p className="text-2xl font-work font-bold text-red-400">
                              {systolicData.value}/{diastolicData.value}
                            </p>
                            <p className="text-xs text-yellow-400">
                              {systolicData.isFallback ? `From ${systolicData.fallbackDate}` : 'Current reading'}
                            </p>
                          </>
                        );
                      }
                      
                      return (
                        <>
                          <p className="text-2xl font-work font-bold text-red-400">No Data</p>
                          <p className="text-xs text-gray-400">Import blood pressure data</p>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="mt-3 h-8 flex justify-center">
                  {(() => {
                    const weeklyBP = getWeeklyTrendData('bloodPressureSystolic');
                    if (weeklyBP.length >= 2) {
                      return (
                        <MiniTrendChart 
                          data={weeklyBP}
                          color="#EF4444"
                          width={120}
                          height={32}
                        />
                      );
                    } else {
                      return (
                        <div className="text-gray-500 text-xs">No trend data</div>
                      );
                    }
                  })()}
                </div>
              </div>

              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-work font-bold text-white">Body Fat</p>
                    <p className="text-xs text-gray-400">Body Composition</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-work font-bold text-purple-400">
                      {latestMetrics?.bodyFatPercentage ? `${latestMetrics.bodyFatPercentage}%` : 'No Data'}
                    </p>
                    <p className="text-xs text-yellow-400">
                      {latestMetrics?.bodyFatPercentage ? 'High' : 'Missing data'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-8 flex justify-center">
                  {(() => {
                    const weeklyBodyFat = getWeeklyTrendData('bodyFatPercentage');
                    if (weeklyBodyFat.length >= 2) {
                      return (
                        <MiniTrendChart 
                          data={weeklyBodyFat}
                          color="#A855F7"
                          width={120}
                          height={32}
                        />
                      );
                    } else {
                      return (
                        <div className="text-gray-500 text-xs">No trend data</div>
                      );
                    }
                  })()}
                </div>
              </div>

              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-work font-bold text-white">Blood Oxygen</p>
                    <p className="text-xs text-gray-400">SpO2 Average</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-work font-bold text-gray-400">
                      {(latestMetrics as any)?.oxygenSaturation ? `${(latestMetrics as any).oxygenSaturation}%` : 'No Data'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(latestMetrics as any)?.oxygenSaturation ? 'Normal range' : 'Import oxygen saturation data'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-8 flex justify-center">
                  {(() => {
                    const weeklyOxygen = getWeeklyTrendData('oxygenSaturation');
                    if (weeklyOxygen.length >= 2) {
                      return (
                        <MiniTrendChart 
                          data={weeklyOxygen}
                          color="#22C55E"
                          width={120}
                          height={32}
                        />
                      );
                    } else {
                      return (
                        <div className="text-gray-500 text-xs">No trend data</div>
                      );
                    }
                  })()}
                </div>
              </div>

              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-work font-bold text-white">Fitness Age</p>
                    <p className="text-xs text-gray-400">Cardiovascular fitness</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-work font-bold text-green-400">
                      {(() => {
                        const calculatedFitnessAge = latestMetrics ? calculateScientificMetabolicAge(latestMetrics) : null;
                        return calculatedFitnessAge ? `${calculatedFitnessAge} years` : "No Data";
                      })()} 
                    </p>
                    <p className="text-xs text-gray-400">
                      {(() => {
                        const calculatedFitnessAge = latestMetrics ? calculateScientificMetabolicAge(latestMetrics) : null;
                        return calculatedFitnessAge ? "Calculated from health metrics" : "Import fitness data";
                      })()} 
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-8 flex justify-center">
                  {(() => {
                    const weeklyFitnessAge = metrics.slice(0, 7).map(m => {
                      return m ? calculateScientificMetabolicAge(m) : null;
                    }).filter(age => age !== null);
                    if (weeklyFitnessAge.length >= 2) {
                      return (
                        <MiniTrendChart 
                          data={weeklyFitnessAge}
                          color="#22C55E"
                          width={120}
                          height={32}
                        />
                      );
                    } else {
                      return (
                        <div className="text-gray-500 text-xs">No trend data</div>
                      );
                    }
                  })()}
                </div>
              </div>

              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-work font-bold text-white">Metabolic Age (Renpho)</p>
                    <p className="text-xs text-gray-400">From smart scale data</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-work font-bold text-orange-400">
                      {(() => {
                        const metabolicAge = getMostRecentValue('metabolicAge', currentDayMetrics);
                        return metabolicAge.value ? `${metabolicAge.value} years` : 'No Data';
                      })()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(() => {
                        const metabolicAge = getMostRecentValue('metabolicAge', currentDayMetrics);
                        return metabolicAge.isFallback ? `From ${metabolicAge.fallbackDate}` : 
                          metabolicAge.value ? 'From Renpho scale' : 'Connect Renpho app or upload CSV';
                      })()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-8 flex justify-center">
                  {(() => {
                    const weeklyMetabolicAge = getWeeklyTrendData('metabolicAge');
                    if (weeklyMetabolicAge.length >= 2) {
                      return (
                        <MiniTrendChart 
                          data={weeklyMetabolicAge}
                          color="#F97316"
                          width={120}
                          height={32}
                        />
                      );
                    } else {
                      return (
                        <div className="text-gray-500 text-xs">No trend data</div>
                      );
                    }
                  })()}
                </div>
              </div>

              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-work font-bold text-white">Stress Score</p>
                    <p className="text-xs text-gray-400">Calculated from RHR, sleep & HRV</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-work font-bold text-yellow-400">
                      {latestMetrics?.stressLevel || 'No Data'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(() => {
                        const calculateStressScore = (metrics: any) => {
                          if (!metrics) return null;
                          let stressScore = 50;
                          if (metrics.restingHeartRate) {
                            const rhr = metrics.restingHeartRate;
                            if (rhr < 60) stressScore -= 15;
                            else if (rhr < 70) stressScore -= 5;
                            else if (rhr > 80) stressScore += 15;
                            else if (rhr > 70) stressScore += 5;
                          }
                          if (metrics.heartRateVariability) {
                            const hrv = metrics.heartRateVariability;
                            if (hrv > 50) stressScore -= 20;
                            else if (hrv > 35) stressScore -= 10;
                            else if (hrv < 25) stressScore += 20;
                            else if (hrv < 35) stressScore += 10;
                          }
                          if (metrics.sleepScore) {
                            const sleep = metrics.sleepScore;
                            if (sleep > 80) stressScore -= 10;
                            else if (sleep > 70) stressScore -= 5;
                            else if (sleep < 50) stressScore += 15;
                            else if (sleep < 60) stressScore += 10;
                          }
                          if (metrics.recoveryScore) {
                            const recovery = metrics.recoveryScore;
                            if (recovery > 80) stressScore -= 15;
                            else if (recovery > 70) stressScore -= 5;
                            else if (recovery < 50) stressScore += 20;
                            else if (recovery < 60) stressScore += 10;
                          }
                          return Math.max(0, Math.min(100, Math.round(stressScore)));
                        };
                        
                        const stressLevel = latestMetrics?.stressLevel;

                        if (!stressLevel && stressLevel !== 0) return 'Calculated from RHR, sleep, and HRV data';
                        if (stressLevel <= 39) return 'Low stress - Optimal recovery state';
                        if (stressLevel <= 59) return 'Moderate stress - Manageable daily load';
                        if (stressLevel <= 79) return 'Elevated stress - Monitor closely';
                        return 'High stress - Recovery recommended';
                      })()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-8 flex justify-center">
                  {(() => {
                    // Calculate stress scores for the past week using historical data
                    const calculateStressScore = (metrics: any) => {
                      if (!metrics) return null;
                      let stressScore = 50;
                      if (metrics.restingHeartRate) {
                        const rhr = metrics.restingHeartRate;
                        if (rhr < 60) stressScore -= 15;
                        else if (rhr < 70) stressScore -= 5;
                        else if (rhr > 80) stressScore += 15;
                        else if (rhr > 70) stressScore += 5;
                      }
                      if (metrics.heartRateVariability) {
                        const hrv = metrics.heartRateVariability;
                        if (hrv > 50) stressScore -= 20;
                        else if (hrv > 35) stressScore -= 10;
                        else if (hrv < 25) stressScore += 20;
                        else if (hrv < 35) stressScore += 10;
                      }
                      if (metrics.sleepScore) {
                        const sleep = metrics.sleepScore;
                        if (sleep > 80) stressScore -= 10;
                        else if (sleep > 70) stressScore -= 5;
                        else if (sleep < 50) stressScore += 15;
                        else if (sleep < 60) stressScore += 10;
                      }
                      if (metrics.recoveryScore) {
                        const recovery = metrics.recoveryScore;
                        if (recovery > 80) stressScore -= 15;
                        else if (recovery > 70) stressScore -= 5;
                        else if (recovery < 50) stressScore += 20;
                        else if (recovery < 60) stressScore += 10;
                      }
                      return Math.max(0, Math.min(100, Math.round(stressScore)));
                    };
                    
                    const weeklyStressScores = metrics.slice(0, 7).map(m => {
                      return calculateStressScore(m);
                    }).filter(score => score !== null);
                    
                    if (weeklyStressScores.length >= 2) {
                      return (
                        <MiniTrendChart 
                          data={weeklyStressScores}
                          color="#F59E0B"
                          width={120}
                          height={32}
                        />
                      );
                    } else {
                      return (
                        <div className="text-gray-500 text-xs">No trend data</div>
                      );
                    }
                  })()}
                </div>
              </div>

              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-work font-bold text-white">Subcutaneous Fat</p>
                    <p className="text-xs text-gray-400">Fat under skin</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-work font-bold text-blue-400">
                      {(() => {
                        const subcutaneousFat = getMostRecentValue('subcutaneousFat', currentDayMetrics);
                        return subcutaneousFat.value ? `${subcutaneousFat.value}%` : 'No Data';
                      })()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(() => {
                        const subcutaneousFat = getMostRecentValue('subcutaneousFat', currentDayMetrics);
                        return subcutaneousFat.isFallback ? `From ${subcutaneousFat.fallbackDate}` : 
                          subcutaneousFat.value ? 'From body composition' : 'Connect Renpho app or upload CSV';
                      })()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-8 flex justify-center">
                  {(() => {
                    const weeklySubcutaneousFat = getWeeklyTrendData('subcutaneousFat');
                    if (weeklySubcutaneousFat.length >= 2) {
                      return (
                        <MiniTrendChart 
                          data={weeklySubcutaneousFat}
                          color="#3B82F6"
                          width={120}
                          height={32}
                        />
                      );
                    } else {
                      return (
                        <div className="text-gray-500 text-xs">No trend data</div>
                      );
                    }
                  })()}
                </div>
              </div>

              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-work font-bold text-white">Visceral Fat</p>
                    <p className="text-xs text-gray-400">Fat around organs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-work font-bold text-red-400">
                      {(() => {
                        const visceralFat = getMostRecentValue('visceralFat', currentDayMetrics);
                        return visceralFat.value ? `${visceralFat.value}` : 'No Data';
                      })()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(() => {
                        const visceralFat = getMostRecentValue('visceralFat', currentDayMetrics);
                        if (!visceralFat.value) return 'Connect Renpho app or upload CSV';
                        return visceralFat.isFallback ? `From ${visceralFat.fallbackDate}` :
                          visceralFat.value > 10 ? 'High risk' : visceralFat.value > 5 ? 'Moderate' : 'Low risk';
                      })()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-8 flex justify-center">
                  {(() => {
                    const weeklyVisceralFat = getWeeklyTrendData('visceralFat');
                    if (weeklyVisceralFat.length >= 2) {
                      return (
                        <MiniTrendChart 
                          data={weeklyVisceralFat}
                          color="#EF4444"
                          width={120}
                          height={32}
                        />
                      );
                    } else {
                      return (
                        <div className="text-gray-500 text-xs">No trend data</div>
                      );
                    }
                  })()}
                </div>
              </div>

              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-work font-bold text-white">BMR (Renpho)</p>
                    <p className="text-xs text-gray-400">Basal Metabolic Rate</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-work font-bold text-green-400">
                      {(() => {
                        const bmr = getMostRecentValue('bmr', currentDayMetrics);
                        return bmr.value ? `${bmr.value} cal` : 'No Data';
                      })()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(() => {
                        const bmr = getMostRecentValue('bmr', currentDayMetrics);
                        return bmr.isFallback ? `From ${bmr.fallbackDate}` : 
                          bmr.value ? 'Calories burned at rest' : 'Connect Renpho app or upload CSV';
                      })()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-8 flex justify-center">
                  {(() => {
                    const weeklyBMR = getWeeklyTrendData('bmr');
                    if (weeklyBMR.length >= 2) {
                      return (
                        <MiniTrendChart 
                          data={weeklyBMR}
                          color="#10B981"
                          width={120}
                          height={32}
                        />
                      );
                    } else {
                      return (
                        <div className="text-gray-500 text-xs">No trend data</div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        );

      case "activity":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-work font-bold text-white mb-2">Activity</h1>
              <p className="text-gray-400">Track your daily activities and workouts</p>
            </div>

            {/* Activity Summary */}
            <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-work font-bold text-lg">Today's Activity</h3>
                <span className="text-green-400 text-sm">
                  {latestMetrics?.steps ? `${latestMetrics.steps.toLocaleString()} steps` : 'No data'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-work font-bold text-white">{(latestMetrics as any)?.steps?.toLocaleString() || "No Data"}</p>
                  <p className="text-xs text-gray-400">Steps</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-work font-bold text-white">{(latestMetrics as any)?.distance ? `${(latestMetrics as any).distance.toFixed(2)} km` : "No Data"}</p>
                  <p className="text-xs text-gray-400">Distance</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-work font-bold text-white">{(latestMetrics as any)?.caloriesBurned?.toLocaleString() || "No Data"}</p>
                  <p className="text-xs text-gray-400">Calories</p>
                </div>
              </div>
              
              {/* Activity Ring Progress */}
              <div className="mt-6 flex items-center justify-between">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="#1A1A1A" strokeWidth="10" fill="none" />
                    <circle 
                      cx="32" cy="32" r="28" 
                      stroke="var(--giddyup-success)" 
                      strokeWidth="10" 
                      fill="none"
                      strokeDasharray={`${(((latestMetrics as any)?.activityRingCompletion || 0.84) * 175.9)} 175.9`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white font-work font-bold text-sm">{Math.round(((latestMetrics as any)?.activityRingCompletion || 0.84) * 100)}%</p>
                  </div>
                </div>
                <div className="flex-1 ml-4">
                  <p className="text-white font-semibold">Daily Activity Goal</p>
                  <p className="text-gray-400 text-sm">Great progress today!</p>
                </div>
              </div>
            </div>

            {/* Recent Workouts */}
            <div className="space-y-4">
              <h3 className="text-white font-work font-bold text-lg">Recent Workouts</h3>
              
              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="flex justify-center items-center">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">No workout data available</p>
                    <p className="text-gray-500 text-xs mt-1">Import Health Connect data with workout records</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Button */}
            <Button 
              onClick={() => setActiveTab("metric-details")} 
              className="w-full mt-6 bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 text-white hover:bg-[var(--giddyup-secondary)]/20"
            >
              Metric Details
            </Button>
          </div>
        );

      case "sleep-details":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <div className="flex items-center mb-6">
              <Button onClick={() => setActiveTab("sleep")} variant="ghost" className="mr-4 text-white">← Back</Button>
              <h1 className="text-2xl font-work font-bold text-white">Sleep Score Details</h1>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--giddyup-card-bg)] rounded-xl p-6">
                <h3 className="text-white font-bold text-lg mb-4">Sleep Stages Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Deep Sleep</span>
                    <span className="text-white font-bold">1h 23m (18%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">REM Sleep</span>
                    <span className="text-white font-bold">2h 15m (29%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Light Sleep</span>
                    <span className="text-white font-bold">4h 07m (53%)</span>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--giddyup-card-bg)] rounded-xl p-6">
                <h3 className="text-white font-bold text-lg mb-4">Sleep Quality Factors</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time to Fall Asleep</span>
                    <span className="text-white font-bold">
                      {(() => {
                        const sleepMetrics = calculateSleepMetrics(sleepStageData, latestMetrics?.sleepDuration);
                        return sleepMetrics.sleepLatency !== null ? `${sleepMetrics.sleepLatency} minutes` : 'No Data';
                      })()
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Awakenings</span>
                    <span className="text-white font-bold">
                      {(() => {
                        const sleepMetrics = calculateSleepMetrics(sleepStageData, latestMetrics?.sleepDuration);
                        return sleepMetrics.awakenings !== null ? `${sleepMetrics.awakenings} times` : 'No Data';
                      })()
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sleep Efficiency</span>
                    <span className="text-white font-bold">
                      {(() => {
                        const sleepMetrics = calculateSleepMetrics(sleepStageData, latestMetrics?.sleepDuration);
                        return sleepMetrics.sleepEfficiency !== null ? `${sleepMetrics.sleepEfficiency}%` : 'No Data';
                      })()
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "activity-log":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <div className="flex items-center mb-6">
              <Button onClick={() => setActiveTab("strain")} variant="ghost" className="mr-4 text-white">← Back</Button>
              <h1 className="text-2xl font-work font-bold text-white">All Activities</h1>
            </div>

            <div className="mb-4">
              <Button onClick={() => setActiveTab('log-activity')} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                + Log New Activity
              </Button>
            </div>

            {activitiesQuery.isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading activities...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-2 text-lg">No activities found</p>
                <p className="text-gray-500 text-sm">Log your first activity to get started with tracking</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity: any) => {
                  const duration = Math.round((new Date(activity.endTime).getTime() - new Date(activity.startTime).getTime()) / (1000 * 60));
                  return (
                    <div key={activity.id} className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-white font-medium text-lg">{activity.name}</h4>
                            {activity.type !== activity.name && (
                              <>
                                <span className="text-gray-400 text-sm">•</span>
                                <span className="text-gray-400 text-sm">{activity.type}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                            <span>{new Date(activity.startTime).toLocaleDateString()}</span>
                            <span>
                              {activity.id?.includes('walking-') 
                                ? 'All Day' 
                                : `${activity.startTime.substring(11, 16)} - ${activity.endTime.substring(11, 16)}`
                              }
                            </span>
                            {!activity.id?.includes('walking-') && <span>{duration} min</span>}
                          </div>
                          {activity.notes && (
                            <p className="text-gray-400 text-sm italic">"{activity.notes}"</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => {
                              setEditingActivity(activity);
                              // Get local date and time correctly without timezone conversion
                              const startDate = new Date(activity.startTime);
                              const endDate = new Date(activity.endTime);
                              setActivityForm({
                                name: activity.name,
                                date: startDate.getFullYear() + '-' + 
                                      String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
                                      String(startDate.getDate()).padStart(2, '0'),
                                startTime: String(startDate.getHours()).padStart(2, '0') + ':' + 
                                          String(startDate.getMinutes()).padStart(2, '0'),
                                endTime: String(endDate.getHours()).padStart(2, '0') + ':' + 
                                        String(endDate.getMinutes()).padStart(2, '0'), 
                                distance: activity.distance?.toString() || '',
                                calories: activity.calories?.toString() || '',
                                notes: activity.notes || ''
                              });
                              setActiveTab('log-activity');
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 p-2"
                          >
                            ✏️
                          </Button>
                          <Button
                            onClick={() => deleteActivity.mutate(activity.id)}
                            variant="ghost"
                            size="sm" 
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2"
                            disabled={deleteActivity.isPending}
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-600">
                        <div className="text-center">
                          <p className="text-white font-bold text-lg">{activity.calories ? `${activity.calories} cal` : 'N/A'}</p>
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Calories</p>
                        </div>
                        <div className="text-center">
                          <p className="text-white font-bold text-lg">{activity.distance ? `${activity.distance.toFixed(2)} km` : 'N/A'}</p>
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Distance</p>
                        </div>
                        <div className="text-center">
                          <p className="text-white font-bold text-lg">
                            {activity.strain ? parseFloat(activity.strain).toFixed(1) : 'N/A'}
                          </p>
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Strain</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "metric-details":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <div className="flex items-center mb-6">
              <Button onClick={() => setActiveTab("vitals")} variant="ghost" className="mr-4 text-white">← Back</Button>
              <h1 className="text-2xl font-work font-bold text-white">Metric Details</h1>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--giddyup-card-bg)] rounded-xl p-6">
                <h3 className="text-white font-bold text-lg mb-4">7-Day Trends</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Resting Heart Rate</span>
                      <span className="text-gray-400">No Data</span>
                    </div>
                    <div className="h-8 bg-gray-800 rounded-lg p-1">
                      <div className="h-full bg-green-500 rounded-sm" style={{width: '75%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">HRV</span>
                      <span className="text-gray-400">No Data</span>
                    </div>
                    <div className="h-8 bg-gray-800 rounded-lg p-1">
                      <div className="h-full bg-blue-500 rounded-sm" style={{width: '80%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "mopup-breakdown":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <div className="flex items-center mb-6">
              <Button onClick={() => setActiveTab("metabolic")} variant="ghost" className="mr-4 text-white">← Back</Button>
              <h1 className="text-2xl font-work font-bold text-white">Mopup Breakdown</h1>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--giddyup-card-bg)] rounded-xl p-6">
                <h3 className="text-white font-bold text-lg mb-4">Metabolic Factors</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cardiovascular Fitness</span>
                    <span className="text-green-400">Excellent (+2 years)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Body Composition</span>
                    <span className="text-green-400">Good (+1 year)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Recovery Patterns</span>
                    <span className="text-yellow-400">Average (0 years)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sleep Quality</span>
                    <span className="text-yellow-400">Average (0 years)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "log-activity":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <div className="flex items-center mb-6">
              <Button onClick={() => {
                setEditingActivity(null);
                setActiveTab(editingActivity ? "activity-log" : "strain");
              }} variant="ghost" className="mr-4 text-white">← Back</Button>
              <h1 className="text-2xl font-work font-bold text-white">
                {editingActivity ? 'Edit Activity' : 'Log Activity'}
              </h1>
            </div>

            <div className="space-y-6">
              {/* Activity Form */}
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-6">
                <h3 className="text-white font-work font-bold mb-4 uppercase tracking-wide text-sm">Activity Details</h3>
                
                <div className="space-y-4">
                  {/* Activity */}
                  <div>
                    <Label htmlFor="activityName" className="text-gray-300 text-sm mb-2 block">Activity</Label>
                    <Input
                      id="activityName"
                      value={activityForm.name}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-[#2A2A2A] border-gray-700 text-white"
                      placeholder="e.g., Running, Cycling, Swimming"
                    />
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="activityDate" className="text-gray-300 text-sm mb-2 block">Date</Label>
                      <Input
                        id="activityDate"
                        type="date"
                        value={activityForm.date}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, date: e.target.value }))}
                        className="bg-[#2A2A2A] border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="startTime" className="text-gray-300 text-sm mb-2 block">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={activityForm.startTime}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="bg-[#2A2A2A] border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime" className="text-gray-300 text-sm mb-2 block">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={activityForm.endTime}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, endTime: e.target.value }))}
                        className="bg-[#2A2A2A] border-gray-700 text-white"
                      />
                    </div>
                  </div>

                  {activityForm.startTime && activityForm.endTime && (
                    <div className="bg-green-900/20 border border-green-400/20 rounded-lg p-3">
                      <p className="text-green-400 text-sm flex items-center">
                        <span className="mr-2">💓</span>
                        Heart rate and health data will be automatically overlaid from this time period
                      </p>
                    </div>
                  )}

                  {/* Optional Details - Auto-estimated when logging */}
                  <div className="bg-green-900/10 border border-green-400/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-3">
                      <span className="text-green-400 text-sm font-medium">🤖 Smart Estimation</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      When you log the activity, calories, distance, and metrics will be automatically estimated using your activity details and heart rate data if available.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="distance" className="text-gray-300 text-sm mb-2 block">Distance (km) <span className="text-gray-500 text-xs">- Optional</span></Label>
                      <Input
                        id="distance"
                        type="number"
                        value={activityForm.distance}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, distance: e.target.value }))}
                        className="bg-[#2A2A2A] border-gray-700 text-white"
                        placeholder="Auto-estimated"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calories" className="text-gray-300 text-sm mb-2 block">Calories <span className="text-gray-500 text-xs">- Optional</span></Label>
                      <Input
                        id="calories"
                        type="number"
                        value={activityForm.calories}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, calories: e.target.value }))}
                        className="bg-[#2A2A2A] border-gray-700 text-white"
                        placeholder="Auto-estimated"
                      />
                    </div>
                  </div>

                  {/* Notes field */}
                  <div>
                    <Label htmlFor="notes" className="text-gray-300 text-sm mb-2 block">Notes <span className="text-gray-500 text-xs">- Optional</span></Label>
                    <Input
                      id="notes"
                      type="text"
                      value={activityForm.notes}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="bg-[#2A2A2A] border-gray-700 text-white"
                      placeholder="How did it feel? Any observations?"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleActivitySubmit}
                    disabled={submitActivity.isPending || !activityForm.name || !activityForm.startTime || !activityForm.endTime}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                  >
                    {submitActivity.isPending 
                      ? (editingActivity ? 'Updating Activity...' : 'Logging Activity...') 
                      : (editingActivity ? 'Update Activity' : 'Log Activity')
                    }
                  </Button>
                </div>
              </div>

              {/* Activity Type Selection */}
              <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
                <h3 className="text-white font-work font-bold mb-2 uppercase tracking-wide text-sm">Quick Activity Selection</h3>
                <p className="text-gray-400 text-xs mb-4">Single click to populate form • Double-click for instant logging</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => selectActivityType('Pickleball', '🏓')}
                    onDoubleClick={() => quickLogActivity('Pickleball', '🏓')}
                    className={`bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white border border-gray-700/50 h-12 justify-start transition-all ${
                      activityForm.type === 'Pickleball' ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <span className="mr-3">🏓</span>Pickleball
                  </Button>
                  <Button 
                    onClick={() => selectActivityType('Padel', '🎾')}
                    onDoubleClick={() => quickLogActivity('Padel', '🎾')}
                    className={`bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white border border-gray-700/50 h-12 justify-start transition-all ${
                      activityForm.type === 'Padel' ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <span className="mr-3">🎾</span>Padel
                  </Button>
                  <Button 
                    onClick={() => selectActivityType('Soccer', '⚽')}
                    onDoubleClick={() => quickLogActivity('Soccer', '⚽')}
                    className={`bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white border border-gray-700/50 h-12 justify-start transition-all ${
                      activityForm.type === 'Soccer' ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <span className="mr-3">⚽</span>Soccer
                  </Button>
                  <Button 
                    onClick={() => selectActivityType('Swimming', '🏊')}
                    onDoubleClick={() => quickLogActivity('Swimming', '🏊')}
                    className={`bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white border border-gray-700/50 h-12 justify-start transition-all ${
                      activityForm.type === 'Swimming' ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <span className="mr-3">🏊</span>Swimming
                  </Button>
                  <Button 
                    onClick={() => selectActivityType('Running', '🏃')}
                    onDoubleClick={() => quickLogActivity('Running', '🏃')}
                    className={`bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white border border-gray-700/50 h-12 justify-start transition-all ${
                      activityForm.type === 'Running' ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <span className="mr-3">🏃</span>Running
                  </Button>
                  <Button 
                    onClick={() => selectActivityType('Hiking', '🥾')}
                    onDoubleClick={() => quickLogActivity('Hiking', '🥾')}
                    className={`bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white border border-gray-700/50 h-12 justify-start transition-all ${
                      activityForm.type === 'Hiking' ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <span className="mr-3">🥾</span>Hiking
                  </Button>
                  <Button 
                    onClick={() => selectActivityType('Lifting', '🏋️')}
                    onDoubleClick={() => quickLogActivity('Lifting', '🏋️')}
                    className={`bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white border border-gray-700/50 h-12 justify-start transition-all ${
                      activityForm.type === 'Lifting' ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <span className="mr-3">🏋️</span>Lifting
                  </Button>
                  <Button 
                    onClick={() => selectActivityType('Skiing', '⛷️')}
                    onDoubleClick={() => quickLogActivity('Skiing', '⛷️')}
                    className={`bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white border border-gray-700/50 h-12 justify-start transition-all ${
                      activityForm.type === 'Skiing' ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <span className="mr-3">⛷️</span>Skiing
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case "recovery-breakdown":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <div className="flex items-center mb-6">
              <Button onClick={() => setActiveTab("sleep")} variant="ghost" className="mr-4 text-white">← Back</Button>
              <h1 className="text-2xl font-work font-bold text-white">Recovery Breakdown</h1>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--giddyup-card-bg)] rounded-xl p-6">
                <h3 className="text-white font-bold text-lg mb-4">Recovery Components</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sleep Recovery</span>
                    <span className="text-green-400">85% (High)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">HRV Recovery</span>
                    <span className="text-yellow-400">72% (Moderate)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">RHR Recovery</span>
                    <span className="text-green-400">88% (High)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "nutrition":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-work font-bold text-white mb-2">Nutrition</h1>
              <p className="text-gray-400">Track your daily nutrition and hydration</p>
            </div>

            {/* Daily Calorie Progress */}
            <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-work font-bold text-lg">Daily Calories</h3>
                <span className="text-gray-400 text-sm">No Data</span>
              </div>
              
              <div className="relative mb-4">
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div className="bg-gray-600 h-3 rounded-full" style={{width: "0%"}}></div>
                </div>
                <div className="absolute top-0 left-0 w-full flex justify-between mt-4">
                  <span className="text-gray-400 font-work font-bold text-2xl">No Data</span>
                  <span className="text-gray-400 text-sm">Import nutrition data</span>
                </div>
              </div>
            </div>

            {/* Macronutrients Breakdown */}
            <div className="mb-6">
              <h3 className="text-white font-work font-semibold mb-3">Macronutrients</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                  <div className="text-center">
                    <p className="text-xl font-work font-bold text-gray-400 mb-1">No Data</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Protein</p>
                    <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-400 h-2 rounded-full" style={{width: "78%"}}></div>
                    </div>
                  </div>
                </div>
                <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                  <div className="text-center">
                    <p className="text-xl font-work font-bold text-green-400 mb-1">180g</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Carbs</p>
                    <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-green-400 h-2 rounded-full" style={{width: "72%"}}></div>
                    </div>
                  </div>
                </div>
                <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                  <div className="text-center">
                    <p className="text-xl font-work font-bold text-yellow-400 mb-1">58g</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Fat</p>
                    <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-yellow-400 h-2 rounded-full" style={{width: "65%"}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hydration & Other Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="text-center">
                  <p className="text-2xl font-work font-bold text-cyan-400 mb-1">2.1L</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Water Intake</p>
                  <p className="text-xs text-green-400 mt-1">87% of goal</p>
                </div>
              </div>
              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="text-center">
                  <p className="text-2xl font-work font-bold text-white mb-1">28g</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Fiber</p>
                  <p className="text-xs text-gray-400 mt-1">Goal: 35g</p>
                </div>
              </div>
              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="text-center">
                  <p className="text-2xl font-work font-bold text-white mb-1">1,890mg</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Sodium</p>
                  <p className="text-xs text-green-400 mt-1">Normal</p>
                </div>
              </div>
              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="text-center">
                  <p className="text-2xl font-work font-bold text-white mb-1">3</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Meals</p>
                  <p className="text-xs text-green-400 mt-1">Tracked today</p>
                </div>
              </div>
            </div>

            {/* Recent Meals */}
            <div className="space-y-4 mb-6">
              <h3 className="text-white font-work font-bold text-lg">Recent Meals</h3>
              
              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-4">
                <div className="flex justify-center items-center">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">No meal data available</p>
                    <p className="text-gray-500 text-xs mt-1">Import nutrition tracking data</p>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setActiveTab("settings")} 
              className="w-full mt-6 bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 text-white hover:bg-[var(--giddyup-secondary)]/20"
            >
              Settings →
            </Button>
          </div>
        );

      case "settings":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <div className="flex items-center mb-6">
              <Button onClick={() => setActiveTab("coach")} variant="ghost" className="mr-4 text-white">← Back</Button>
              <h1 className="text-2xl font-work font-bold text-white">Settings</h1>
            </div>

            <div className="space-y-6">
              {/* Data Import Section */}
              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl p-6">
                <h3 className="text-white font-work font-bold text-lg mb-4">Health Data Import</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Import your health data from various sources to get comprehensive insights
                </p>
                <HealthConnectImporter />
              </div>

              {/* Other Settings - render the existing settings page */}
              <div className="bg-[var(--giddyup-card-bg)] border border-[var(--giddyup-secondary)]/20 rounded-xl">
                <WhoopSettingsPage onBack={() => setActiveTab("coach")} hideBackButton={true} />
              </div>
            </div>
          </div>
        );

      case "sleep-debt":
        const sleepData = metrics.slice(0, 7).map(metric => ({
          date: metric.date,
          sleepDuration: metric.sleepDuration || null,
          sleepScore: metric.sleepScore || null
        }));
        
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <SleepDebtTracker recentSleep={sleepData} targetSleepHours={8} />
          </div>
        );

      case "training-load":
        const strainData = metrics.slice(0, 14).map(metric => {
          let calculatedStrainScore = metric.strainScore;
          
          // Calculate strain score if missing but we have activity data
          if ((calculatedStrainScore === null || calculatedStrainScore === undefined) && (metric.steps || metric.caloriesBurned)) {
            // Use the same formula as the backend strain calculation
            let strain = 0;
            
            // Base strain from steps (up to 8 from steps, 16k steps max)
            if (metric.steps) {
              strain += Math.min(metric.steps / 2000, 8);
            }
            
            // Active minutes contribution (estimate from calories if no active minutes)
            if (metric.caloriesBurned) {
              const estimatedActiveMinutes = metric.caloriesBurned / 8; // ~8 calories per minute
              strain += Math.min(estimatedActiveMinutes / 15, 8);
            }
            
            calculatedStrainScore = Math.max(0, Math.min(21, Math.round(strain)));
          }
          
          return {
            date: metric.date,
            strainScore: calculatedStrainScore !== null && calculatedStrainScore !== undefined ? calculatedStrainScore : 0,
            activities: []
          };
        });
        
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <TrainingLoadTracker recentStrain={strainData} fitnessLevel="intermediate" />
          </div>
        );

      case "weekly-usage":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-work font-bold text-white mb-2">Weekly Usage</h1>
              <p className="text-gray-400">Track your app engagement</p>
            </div>

            {/* Activity Circle */}
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#1A1A1A" strokeWidth="12" fill="none"/>
                  <circle 
                    cx="50" cy="50" r="40" 
                    stroke="#00D4AA" 
                    strokeWidth="12" 
                    fill="none"
                    strokeDasharray="188.4 62.8"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-white font-work text-sm mb-1">Activity</p>
                  <p className="text-white font-work font-bold text-4xl mb-1">{latestMetrics?.steps ? Math.floor((latestMetrics.steps / 10000) * 120) : '0'}</p>
                  <p className="text-gray-400 font-work text-xs">min</p>
                  <p className="text-gray-400 font-work text-xs">of 120 min goal</p>
                </div>
              </div>
            </div>

            {/* Weekly Progress Circles */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-3">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="35" stroke="#1A1A1A" strokeWidth="10" fill="none"/>
                    <circle 
                      cx="50" cy="50" r="35" 
                      stroke="#0066CC" 
                      strokeWidth="10" 
                      fill="none"
                      strokeDasharray="131.9 87.9"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-white font-work font-bold text-lg">{metrics?.filter((m: any) => m.weight).length || 0}</p>
                  </div>
                </div>
                <p className="text-white font-work text-sm">Weight</p>
                <p className="text-white font-work text-sm">Measurements</p>
                <p className="text-gray-400 text-xs">this week</p>
              </div>

              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-3">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="35" stroke="#1A1A1A" strokeWidth="10" fill="none"/>
                    <circle 
                      cx="50" cy="50" r="35" 
                      stroke="#FF6B35" 
                      strokeWidth="10" 
                      fill="none"
                      strokeDasharray="87.9 131.9"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-white font-work font-bold text-lg">{conversations?.length || 0}</p>
                  </div>
                </div>
                <p className="text-white font-work text-sm">Meals</p>
                <p className="text-gray-400 text-xs">this week</p>
              </div>
            </div>

            {/* Weekly Usage Stats */}
            <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 mb-6">
              <h3 className="text-white font-work font-bold text-lg mb-4 flex items-center justify-between">
                WEEKLY USAGE
                <span className="text-gray-400">›</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <p className="text-white text-sm">You surpassed the activity goal for {metrics?.filter((m: any) => m.steps && m.steps > 10000).length || 0} days</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <p className="text-white text-sm">You averaged {Math.round((metrics?.filter((m: any) => m.weight).length || 0) / 7 * 7)} weight measurements</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "weekly-summary":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            {/* Time Period Tabs */}
            <div className="flex justify-center mb-8">
              <div className="bg-[#1A1A1A] rounded-full p-1 flex">
                <button 
                  onClick={() => setSummaryPeriod('7D')}
                  className={`px-4 py-2 rounded-full text-sm ${summaryPeriod === '7D' ? 'text-white bg-gray-700' : 'text-gray-400'}`}
                >
                  7D
                </button>
                <button 
                  onClick={() => setSummaryPeriod('30D')}
                  className={`px-4 py-2 rounded-full text-sm ${summaryPeriod === '30D' ? 'text-white bg-gray-700' : 'text-gray-400'}`}
                >
                  30D
                </button>
                <button 
                  onClick={() => setSummaryPeriod('90D')}
                  className={`px-4 py-2 rounded-full text-sm ${summaryPeriod === '90D' ? 'text-white bg-gray-700' : 'text-gray-400'}`}
                >
                  90D
                </button>
              </div>
            </div>

            {/* Dynamic Metrics with Trend Analysis Based on Selected Period */}
            <div className="space-y-4 mb-6">
              {(() => {
                // Use all metrics since the API already filters by the selected period
                const periodMetrics = metrics;
                const hasData = periodMetrics.length > 0;
                const periodDays = getDaysCount();
                
                // Debug logging to understand what data we have
                console.log(`Period: ${summaryPeriod}, Days: ${periodDays}, Total available: ${metrics.length} records`);
                console.log('Date range:', periodMetrics.length > 0 ? 
                  `${periodMetrics[periodMetrics.length-1]?.date?.split('T')[0]} to ${periodMetrics[0]?.date?.split('T')[0]}` : 
                  'No data');
                console.log('Sleep score range:', periodMetrics.map(m => m.sleepScore).filter(s => s).slice(0, 3), '...');

                // Helper function to find the most recent and oldest valid values with fallback
                const findValidDataPoints = (values: (number | null)[], periodMetrics: any[], metricName: string) => {
                  // Find most recent valid value
                  let latestValue = null;
                  let latestIndex = -1;
                  for (let i = 0; i < values.length; i++) {
                    if (values[i] !== null && values[i] !== undefined) {
                      latestValue = values[i];
                      latestIndex = i;
                      break;
                    }
                  }

                  // Find oldest valid value within the period, with fallback to extend search
                  let oldestValue = null;
                  let oldestIndex = -1;
                  
                  // First try within the selected period
                  for (let i = values.length - 1; i >= 0; i--) {
                    if (values[i] !== null && values[i] !== undefined) {
                      oldestValue = values[i];
                      oldestIndex = i;
                      break;
                    }
                  }
                  
                  // If we couldn't find an oldest value in the period, extend search to all available data
                  if (oldestValue === null && metrics.length > periodDays) {
                    for (let i = periodDays; i < Math.min(metrics.length, periodDays + 30); i++) {
                      const extendedMetric = metrics[i];
                      const extendedValue = metricName === 'metabolicAge' ? 
                        calculateScientificMetabolicAge(extendedMetric) : 
                        extendedMetric[metricName];
                      
                      if (extendedValue !== null && extendedValue !== undefined) {
                        oldestValue = extendedValue;
                        oldestIndex = i;
                        break;
                      }
                    }
                  }
                  
                  return { latestValue, oldestValue, latestIndex, oldestIndex };
                };

                // Helper function to calculate trends with improved fallback logic
                const calculateTrend = (values: (number | null)[], metricName: string) => {
                  const { latestValue, oldestValue } = findValidDataPoints(values, periodMetrics, metricName);
                  
                  if (latestValue === null || oldestValue === null) {
                    return { change: null, trend: 'stable', color: 'gray-400', hasData: false };
                  }
                  
                  if (latestValue === oldestValue) {
                    return { change: 0, trend: 'stable', color: 'gray-400', hasData: true };
                  }
                  
                  const change = latestValue - oldestValue;
                  const percentChange = Math.abs(change / oldestValue * 100);
                  
                  let trend = 'stable';
                  let color = 'gray-400';
                  
                  if (percentChange > 0.5) { // Sensitive threshold to catch small changes
                    if (change > 0) {
                      // For metrics where higher is better (HRV, muscle mass, sleepScore)
                      if (['heartRateVariability', 'muscleMass', 'sleepScore'].includes(metricName)) {
                        trend = 'improving';
                        color = 'green-400';
                      } else if (['bodyFatPercentage', 'weight', 'metabolicAge'].includes(metricName)) {
                        trend = 'increasing';
                        color = 'yellow-400';
                      }
                    } else {
                      // For metrics where lower is better (body fat, weight, metabolic age)
                      if (['bodyFatPercentage', 'weight', 'metabolicAge'].includes(metricName)) {
                        trend = 'improving';
                        color = 'green-400';
                      } else if (['heartRateVariability', 'muscleMass', 'sleepScore'].includes(metricName)) {
                        trend = 'declining';
                        color = 'red-400';
                      }
                    }
                  }
                  
                  return { change: change, trend, color, hasData: true };
                };

                if (!hasData) {
                  return (
                    <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-6 text-center">
                      <h4 className="text-white font-medium mb-2">No Data Available</h4>
                      <p className="text-gray-300 text-sm">
                        Import Health Connect data to see trends over your selected {summaryPeriod} period.
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Weight */}
                    <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-work font-bold text-lg">Weight</p>
                          <p className="text-gray-400 text-xs mt-1">Last {summaryPeriod}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-work font-bold text-2xl">
                            {latestMetrics?.weight ? `${latestMetrics.weight.toFixed(1)} lbs` : 'No Data'}
                          </p>
                          {(() => {
                            const weights = periodMetrics.map(m => m.weight);
                            const trend = calculateTrend(weights, 'weight');
                            if (!trend.hasData || trend.change === null) {
                              return (
                                <span className="text-gray-400 text-sm">
                                  {weights.filter(w => w).length > 0 ? 'insufficient data' : 'no measurements'}
                                </span>
                              );
                            }
                            const changeText = Math.abs(trend.change).toFixed(1);
                            return (
                              <div className="flex items-center justify-end space-x-1 mt-1">
                                <span className={`text-${trend.color} text-sm`}>
                                  {trend.change > 0 ? '↗' : trend.change < 0 ? '↘' : '→'} {changeText} lbs
                                </span>
                                <span className={`text-${trend.color} text-xs`}>
                                  ({trend.trend})
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* HRV */}
                    <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-work font-bold text-lg">HRV</p>
                          <p className="text-gray-400 text-xs mt-1">Last {summaryPeriod}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-work font-bold text-2xl">
                            {latestMetrics?.heartRateVariability ? `${latestMetrics.heartRateVariability} ms` : 'No Data'}
                          </p>
                          {(() => {
                            const hrvValues = periodMetrics.map(m => m.heartRateVariability);
                            const trend = calculateTrend(hrvValues, 'heartRateVariability');
                            if (!trend.hasData || trend.change === null) {
                              return (
                                <span className="text-gray-400 text-sm">
                                  {hrvValues.filter(h => h).length > 0 ? 'insufficient data' : 'no measurements'}
                                </span>
                              );
                            }
                            return (
                              <div className="flex items-center justify-end space-x-1 mt-1">
                                <span className={`text-${trend.color} text-sm`}>
                                  {trend.change > 0 ? '↗' : trend.change < 0 ? '↘' : '→'} {Math.abs(trend.change).toFixed(1)} ms
                                </span>
                                <span className={`text-${trend.color} text-xs`}>
                                  ({trend.trend})
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Body Fat */}
                    <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-work font-bold text-lg">Body Fat</p>
                          <p className="text-gray-400 text-xs mt-1">Last {summaryPeriod}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-work font-bold text-2xl">
                            {latestMetrics?.bodyFatPercentage ? `${latestMetrics.bodyFatPercentage}%` : 'No Data'}
                          </p>
                          {(() => {
                            const bodyFatValues = periodMetrics.map(m => m.bodyFatPercentage);
                            const trend = calculateTrend(bodyFatValues, 'bodyFatPercentage');
                            if (!trend.hasData || trend.change === null) {
                              return (
                                <span className="text-gray-400 text-sm">
                                  {bodyFatValues.filter(bf => bf).length > 0 ? 'insufficient data' : 'no measurements'}
                                </span>
                              );
                            }
                            return (
                              <div className="flex items-center justify-end space-x-1 mt-1">
                                <span className={`text-${trend.color} text-sm`}>
                                  {trend.change > 0 ? '↗' : trend.change < 0 ? '↘' : '→'} {Math.abs(trend.change).toFixed(1)}%
                                </span>
                                <span className={`text-${trend.color} text-xs`}>
                                  ({trend.trend})
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Metabolic Age */}
                    <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-work font-bold text-lg">Metabolic Age</p>
                          <p className="text-gray-400 text-xs mt-1">Last {summaryPeriod}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-work font-bold text-2xl">
                            {(() => {
                              const scientificAge = calculateScientificMetabolicAge(latestMetrics);
                              return scientificAge ? `${scientificAge} yrs` : 'No Data';
                            })()}
                          </p>
                          {(() => {
                            // Calculate metabolic age for each period to show trend with fallback
                            const metabolicAges = periodMetrics.map(m => calculateScientificMetabolicAge(m));
                            const trend = calculateTrend(metabolicAges, 'metabolicAge');
                            const userAge = latestMetrics?.age || 50;
                            const currentAge = calculateScientificMetabolicAge(latestMetrics);
                            const ageDiff = currentAge ? userAge - currentAge : 0;
                            
                            if (!trend.hasData || trend.change === null) {
                              return (
                                <div className="text-right">
                                  <div className="flex items-center justify-end space-x-1 mt-1">
                                    <span className="text-gray-400 text-sm">
                                      {metabolicAges.filter(age => age !== null).length > 0 ? 'insufficient data' : 'no calculations'}
                                    </span>
                                  </div>
                                  {currentAge && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      {ageDiff > 0 ? `${ageDiff} yrs younger` : ageDiff < 0 ? `${Math.abs(ageDiff)} yrs older` : 'same as actual age'}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            
                            return (
                              <div className="text-right">
                                <div className="flex items-center justify-end space-x-1 mt-1">
                                  <span className={`text-${trend.color} text-sm`}>
                                    {trend.change > 0 ? '↗' : trend.change < 0 ? '↘' : '→'} {Math.abs(trend.change).toFixed(1)} yrs
                                  </span>
                                  <span className={`text-${trend.color} text-xs`}>
                                    ({trend.trend})
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {ageDiff > 0 ? `${ageDiff} yrs younger` : ageDiff < 0 ? `${Math.abs(ageDiff)} yrs older` : 'same as actual age'}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Sleep Quality */}
                    <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-work font-bold text-lg">Sleep Quality</p>
                          <p className="text-gray-400 text-xs mt-1">Average {summaryPeriod}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-work font-bold text-2xl">
                            {(() => {
                              const sleepScores = periodMetrics.map(m => m.sleepScore).filter(s => s !== null) as number[];
                              if (sleepScores.length === 0) return 'No Data';
                              const average = sleepScores.reduce((sum, score) => sum + score, 0) / sleepScores.length;
                              return `${average.toFixed(0)}%`;
                            })()}
                          </p>
                          {(() => {
                            const sleepScores = periodMetrics.map(m => m.sleepScore);
                            const trend = calculateTrend(sleepScores, 'sleepScore');
                            if (!trend.hasData || trend.change === null) {
                              return (
                                <span className="text-gray-400 text-sm">
                                  {sleepScores.filter(s => s).length > 0 ? 'insufficient data' : 'no sleep data'}
                                </span>
                              );
                            }
                            return (
                              <div className="flex items-center justify-end space-x-1 mt-1">
                                <span className={`text-${trend.color} text-sm`}>
                                  {trend.change > 0 ? '↗' : trend.change < 0 ? '↘' : '→'} {Math.abs(trend.change).toFixed(1)}%
                                </span>
                                <span className={`text-${trend.color} text-xs`}>
                                  ({trend.trend})
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Summary Insight */}
            <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8  flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">📊</span>
                </div>
                <div>
                  <p className="text-white font-medium mb-2">
                    {(() => {
                      if (!metrics || metrics.length === 0) {
                        return 'Import health data to see trends and personalized insights.';
                      }
                      
                      const userAge = latestMetrics?.age || 50; // User's actual age from database
                      const days = summaryPeriod === '7D' ? '7' : summaryPeriod === '30D' ? '30' : '90';
                      let insight = `Based on ${days} days of data: `;
                      
                      const scientificAge = calculateScientificMetabolicAge(latestMetrics);
                      if (scientificAge) {
                        const ageDiff = userAge - scientificAge;
                        if (ageDiff > 0) {
                          insight += `Your metabolic age shows you're aging ${ageDiff} years slower than average.`;
                        } else if (ageDiff < 0) {
                          insight += `Your metabolic age shows you're aging ${Math.abs(ageDiff)} years faster than average.`;
                        } else {
                          insight += 'Your metabolic age shows you\'re aging at a normal rate.';
                        }
                      } else {
                        insight += 'Your metabolic data shows insufficient information for analysis.';
                      }
                      
                      if (latestMetrics?.heartRateVariability) {
                        if (latestMetrics.heartRateVariability > 35) {
                          insight += ' Your HRV indicates good recovery capacity.';
                        } else {
                          insight += ' Consider focusing on recovery and stress management.';
                        }
                      } else {
                        insight += ' Import HRV data for recovery insights.';
                      }
                      
                      return insight;
                    })()}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {metrics && metrics.length > 0 ? 
                      'Continue tracking for more detailed analysis and recommendations.' :
                      'Connect Health Connect or other fitness devices for comprehensive tracking.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "pace-of-aging":
        return (
          <div className="bg-black min-h-screen px-4 pt-8 pb-24">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-work font-bold text-white mb-2">Pace of Aging</h1>
              <p className="text-gray-400">Track how fast you're aging based on biomarkers</p>
            </div>

            {/* Method Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-[#1A1A1A] rounded-full p-1 flex">
                <button 
                  onClick={() => setAgingMethod('whoop')}
                  className={`px-4 py-2 rounded-full text-sm ${agingMethod === 'whoop' ? 'text-white bg-gray-700' : 'text-gray-400'}`}
                >
                  Whoop Method
                </button>
                <button 
                  onClick={() => setAgingMethod('scientific')}
                  className={`px-4 py-2 rounded-full text-sm ${agingMethod === 'scientific' ? 'text-white bg-gray-700' : 'text-gray-400'}`}
                >
                  Scientific Method
                </button>
              </div>
            </div>

            {agingMethod === 'whoop' ? (
              <>
                {/* Whoop Method - Pace of Aging Score */}
                <div className="flex justify-center mb-8">
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#1A1A1A" strokeWidth="8" fill="none"/>
                      <circle 
                        cx="50" cy="50" r="40" 
                        stroke="#1A1A1A" 
                        strokeWidth="8" 
                        fill="none"
                        strokeDasharray="251.2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-white font-work text-sm mb-1">PACE OF AGING</p>
                      <p className="text-white font-work font-bold text-5xl mb-1">
                        {agingAnalysis?.agingPaceScore ? `${agingAnalysis.agingPaceScore}%` : 'TBD'}
                      </p>
                      <p className="text-gray-300 font-work text-sm">
                        {agingAnalysis?.agingPaceScore ? 'of normal aging rate' : 'Import biometric data'}
                      </p>
                      <p className="text-gray-400 font-work text-xs">
                        {latestMetrics?.metabolicAge ? 'Based on health metrics' : 'for aging analysis'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pace Explanation - Whoop Method */}
                <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 mb-6">
                  <h3 className="text-white font-work font-bold text-lg mb-3">What This Means (Whoop Method)</h3>
                  <p className="text-gray-300 text-sm mb-2">
                    {agingAnalysis?.personalizedSummary || 'No aging analysis available'}
                  </p>
                  <p className="text-gray-400 text-sm">• {agingAnalysis?.comparison || 'Based on comprehensive health metrics'}</p>
                  <p className="text-gray-400 text-sm">• {agingAnalysis?.improvementPotential || 'Lower percentages indicate slower aging'}</p>
                  <p className="text-gray-400 text-sm">• Analysis considers body composition, cardiovascular health, recovery, and activity levels</p>
                </div>

                {/* Contributing Factors - Whoop's 9 Healthspan contributors */}
                <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 mb-6">
                  <h3 className="text-white font-work font-bold text-lg mb-4">Healthspan Contributors (30-day)</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white">Sleep Hours</span>
                      <span className={latestMetrics?.sleepDuration ? 'text-green-400' : 'text-gray-400'}>
                        {latestMetrics?.sleepDuration ? `${(latestMetrics.sleepDuration / 60).toFixed(1)}h avg` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Sleep Consistency</span>
                      <span className={latestMetrics?.sleepScore ? 'text-green-400' : 'text-gray-400'}>
                        {latestMetrics?.sleepScore ? `${latestMetrics.sleepScore}% quality` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Resting Heart Rate</span>
                      <span className={latestMetrics?.restingHeartRate ? 'text-green-400' : 'text-gray-400'}>
                        {latestMetrics?.restingHeartRate ? `${latestMetrics.restingHeartRate} bpm` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">VO2 Max</span>
                      <span className={latestMetrics?.vo2Max ? 'text-green-400' : 'text-gray-400'}>
                        {latestMetrics?.vo2Max ? `${Number(latestMetrics.vo2Max).toFixed(1)} mL/kg/min` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Daily Steps</span>
                      <span className="text-gray-400">
                        {latestMetrics?.steps ? `${latestMetrics.steps.toLocaleString()} avg` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Zone 1-3 Time</span>
                      <span className={latestMetrics?.activeMinutes ? 'text-yellow-400' : 'text-gray-400'}>
                        {latestMetrics?.steps ? `${Math.floor((latestMetrics.steps / 10000) * 45)} min/week` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Zone 4-5 Time</span>
                      <span className={latestMetrics?.strainScore ? 'text-orange-400' : 'text-gray-400'}>
                        {latestMetrics?.strainScore ? `${Math.floor(latestMetrics.strainScore * 2)} min/week` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Strength Activity</span>
                      <span className="text-green-400">
                        2 sessions/week
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Scientific Method - Aging Rate Score */}
                <div className="flex justify-center mb-8">
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#1A1A1A" strokeWidth="8" fill="none"/>
                      <circle 
                        cx="50" cy="50" r="40" 
                        stroke="#00D4AA" 
                        strokeWidth="8" 
                        fill="none"
                        strokeDasharray="188.4 62.8"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-white font-work text-xs mb-1 tracking-wide">AGING PACE</p>
                      <p className="text-white font-work font-bold text-5xl mb-1">
                        {(() => {
                          // Scientific aging rate based on multiple biomarkers
                          const calculatedMetabolicAge = calculateScientificMetabolicAge(latestMetrics);
                          if (calculatedMetabolicAge && latestMetrics?.heartRateVariability && latestMetrics?.recoveryScore) {
                            const hrv_score = latestMetrics.heartRateVariability > 35 ? 1.2 : 0.8;
                            const recovery_score = latestMetrics.recoveryScore / 100;
                            const metabolic_score = 50 / calculatedMetabolicAge;
                            const aging_rate = ((hrv_score + recovery_score + metabolic_score) / 3 * 100).toFixed(0);
                            return `${aging_rate}%`;
                          }
                          return 'No Data';
                        })()}
                      </p>
                      <div className="text-center">
                        <p className="text-gray-300 font-work text-xs leading-tight">
                          {(calculateScientificMetabolicAge(latestMetrics) && latestMetrics?.heartRateVariability && latestMetrics?.recoveryScore) ? 'cellular efficiency' : 'Import biomarker data'}
                        </p>
                        <p className="text-gray-300 font-work text-xs leading-tight">
                          {(calculateScientificMetabolicAge(latestMetrics) && latestMetrics?.heartRateVariability && latestMetrics?.recoveryScore) ? 'score' : 'for analysis'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pace Explanation - Scientific Method */}
                <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 mb-6">
                  <h3 className="text-white font-work font-bold text-lg mb-3">What This Means (Scientific Method)</h3>
                  <p className="text-gray-300 text-sm mb-2">
                    {(() => {
                      const calculatedMetabolicAge = calculateScientificMetabolicAge(latestMetrics);
                      return (calculatedMetabolicAge && latestMetrics?.heartRateVariability && latestMetrics?.recoveryScore) ? (
                        `Cellular efficiency analysis shows ${latestMetrics.heartRateVariability > 35 ? 'good' : 'reduced'} autonomic function, ${
                          latestMetrics.recoveryScore > 70 ? 'optimal' : 'suboptimal'
                        } recovery capacity, and ${
                          calculatedMetabolicAge < 50 ? 'enhanced' : 'normal'
                        } metabolic function.`
                      ) : 'No biomarker analysis available';
                    })()}
                  </p>
                  <p className="text-gray-400 text-sm">• Based on HRV autonomic nervous system function</p>
                  <p className="text-gray-400 text-sm">• Recovery score indicates cellular repair efficiency</p>
                  <p className="text-gray-400 text-sm">• Metabolic age reflects mitochondrial health</p>
                </div>

                {/* Contributing Factors - Scientific biomarkers */}
                <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800/50 p-4 mb-6">
                  <h3 className="text-white font-work font-bold text-lg mb-4">Key Biomarkers</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white">HRV Trends</span>
                      <span className="text-gray-400">
                        {latestMetrics?.heartRateVariability ? `${latestMetrics.heartRateVariability} ms` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Sleep Quality</span>
                      <span className="text-gray-400">
                        {latestMetrics?.sleepScore ? `${latestMetrics.sleepScore}%` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Recovery Score</span>
                      <span className="text-gray-400">
                        {latestMetrics?.recoveryScore ? `${latestMetrics.recoveryScore}%` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Body Fat %</span>
                      <span className="text-gray-400">
                        {(latestMetrics as any)?.bodyFatPercentage ? `${(latestMetrics as any).bodyFatPercentage.toFixed(1)}%` : 'No Data'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Metabolic Health</span>
                      <span className={calculateScientificMetabolicAge(latestMetrics) ? 'text-green-400' : 'text-gray-400'}>
                        {(() => {
                          const calculatedMetabolicAge = calculateScientificMetabolicAge(latestMetrics);
                          return calculatedMetabolicAge ? `${calculatedMetabolicAge < 50 ? 'Excellent' : calculatedMetabolicAge < 55 ? 'Good' : 'Fair'}` : 'No Data';
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Cellular Efficiency</span>
                      <span className={latestMetrics?.recoveryScore ? 'text-green-400' : 'text-gray-400'}>
                        {latestMetrics?.recoveryScore ? `${latestMetrics.recoveryScore > 70 ? 'High' : latestMetrics.recoveryScore > 50 ? 'Moderate' : 'Low'}` : 'No Data'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case "aging-recommendations":
        return (
          <MetabolicRecommendations onNavigate={setActiveTab} />
        );

      default:
        return (
          <div className="bg-black min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-white text-2xl font-bold mb-4">Coming Soon</h1>
              <p className="text-gray-400 mb-6">This feature is under development</p>
              <Button onClick={() => setActiveTab("dashboard")} className="bg-green-500 hover:bg-green-600">
                Back to Dashboard
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {renderTabContent()}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

// Heart Rate Metrics Grid Component with day-level fallback
function HeartRateMetricsGrid({ 
  latestActivity, 
  selectedDate, 
  selectedDateMetrics 
}: { 
  latestActivity: any, 
  selectedDate: Date, 
  selectedDateMetrics: any 
}) {
  // Query for manual heart rate data for the selected date
  const dateString = selectedDate.toISOString().split('T')[0];
  const { data: manualHeartRateData } = useQuery({
    queryKey: ['/api/manual-heart-rate', dateString],
  });

  // Query for heart rate data points for the selected date
  const { data: heartRateData } = useQuery({
    queryKey: ['/api/health-data-points', 'heart_rate', dateString],
    queryFn: async () => {
      const response = await fetch(`/api/health-data-points?dataType=heart_rate&date=${selectedDate.toISOString()}`);
      if (!response.ok) throw new Error('Failed to fetch heart rate data');
      return response.json();
    },
    enabled: !latestActivity?.averageHeartRate && !latestActivity?.maxHeartRate && !manualHeartRateData?.avgHRAwake && !manualHeartRateData?.maxHR,
  });

  // Calculate day-level heart rate metrics from health data points
  const calculateDayHeartRateMetrics = () => {
    if (!heartRateData) return { avgHR: null, maxHR: null };
    
    // Filter heart rate data points for waking hours (6 AM to 11 PM)
    const wakingHoursData = heartRateData.filter((point: any) => {
      if (point.dataType !== 'heart_rate') return false;
      const hour = new Date(point.timestamp).getHours();
      return hour >= 6 && hour <= 23;
    });
    
    if (wakingHoursData.length === 0) return { avgHR: null, maxHR: null };
    
    const heartRates = wakingHoursData.map((point: any) => point.value).filter((hr: number) => hr > 0 && hr < 200);
    if (heartRates.length === 0) return { avgHR: null, maxHR: null };
    
    const avgHR = Math.round(heartRates.reduce((sum: number, hr: number) => sum + hr, 0) / heartRates.length);
    const maxHR = Math.max(...heartRates);
    
    return { avgHR, maxHR };
  };

  const dayMetrics = calculateDayHeartRateMetrics();
  
  // Helper function to get manual calories with priority
  const getManualCalories = (): number | null => {
    if (manualHeartRateData?.calories && manualHeartRateData.calories > 0) {
      return manualHeartRateData.calories;
    }
    return null;
  };
  
  // Determine heart rate values: manual data first, then activity, then day-level continuous monitoring data
  const avgHeartRate = (manualHeartRateData?.avgHRAwake && manualHeartRateData.avgHRAwake > 0) ? 
    manualHeartRateData.avgHRAwake : 
    (latestActivity?.averageHeartRate || dayMetrics.avgHR);
  
  const maxHeartRate = (manualHeartRateData?.maxHR && manualHeartRateData.maxHR > 0) ? 
    manualHeartRateData.maxHR : 
    (latestActivity?.maxHeartRate || dayMetrics.maxHR);
  
  return (
    <div className="grid grid-cols-2 gap-4 mt-6 mb-6">
      <WhoopStyleCard
        title="Average Heart Rate"
        value={avgHeartRate ? `${avgHeartRate} bpm` : "No Data"}
        size="medium"
        color="blue"
      />
      
      <WhoopStyleCard
        title="Maximum Heart Rate"
        value={maxHeartRate ? `${maxHeartRate} bpm` : "No Data"}
        size="medium"
        color="red"
      />
      
      <WhoopStyleCard
        title="Active Calories"
        value={(() => {
          // Priority: Manual calories from Settings tab
          const manualCalories = getManualCalories();
          if (manualCalories) {
            return `${manualCalories} kcal`;
          }
          
          // Fallback: Device active calories data
          return latestActivity?.activeCalories ? `${latestActivity.activeCalories} kcal` : 
                 selectedDateMetrics?.activeCalories ? `${selectedDateMetrics.activeCalories} kcal` : "No Data";
        })()}
        size="medium"
        color="orange"
      />
      
      <WhoopStyleCard
        title="Distance"
        value={latestActivity?.distance ? `${latestActivity.distance.toFixed(2)} km` : 
               selectedDateMetrics?.distance ? `${selectedDateMetrics.distance.toFixed(2)} km` : "No Data"}
        size="medium"
        color="green"
      />
    </div>
  );
}