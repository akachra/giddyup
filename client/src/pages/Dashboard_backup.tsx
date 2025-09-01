import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import BottomNavigation from "@/components/BottomNavigation";
import ReadinessRing from "@/components/ReadinessRing";
import MetricCard from "@/components/MetricCard";
import WeeklyProgressRing from "@/components/WeeklyProgressRing";
import AICoachSummary from "@/components/AICoachSummary";
import { HealthMetrics, Activity, UserSettings } from "@shared/schema";
import { Bell, UserCircle, Plus, Heart, Moon, Zap, Watch, Bot, Settings, Download, Edit, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type TabType = "dashboard" | "sleep" | "strain" | "coach" | "vitals" | "metabolic" | "activity" | "nutrition" | "settings" | "recovery";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const { toast } = useToast();

  const { data: healthMetrics = [] } = useQuery<HealthMetrics[]>({
    queryKey: ["/api/health-metrics"],
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: userSettings } = useQuery<UserSettings>({
    queryKey: ["/api/user-settings"],
  });

  const { data: conversation = [] } = useQuery<any[]>({
    queryKey: ["/api/ai-coach/conversation"],
  });

  const latestMetrics = healthMetrics[0];

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    try {
      const response = await apiRequest("POST", "/api/ai-coach/chat", { message: chatMessage });
      const data = await response.json();
      
      setChatHistory(prev => [
        ...prev,
        { role: "user", content: chatMessage, timestamp: new Date() },
        { role: "assistant", content: data.message, timestamp: new Date() }
      ]);
      setChatMessage("");
      
      toast({
        title: "Message sent",
        description: "AI Coach has responded to your message.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message to AI Coach.",
      });
    }
  };

  const handleQuickAction = async (action: string) => {
    try {
      const response = await apiRequest("POST", "/api/ai-coach/daily-summary", {});
      const data = await response.json();
      
      setChatHistory(prev => [
        ...prev,
        { role: "assistant", content: data.summary, timestamp: new Date() }
      ]);
      
      toast({
        title: "Daily Summary",
        description: "AI Coach has generated your daily summary.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate daily summary.",
      });
    }
  };

  const handleHealthConnectImport = async () => {
    try {
      await apiRequest("POST", "/api/health-connect/import", {});
      toast({
        title: "Import Successful",
        description: "Health Connect data has been imported.",
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import Health Connect data.",
      });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="bg-black min-h-screen">
            <div className="px-6 py-6">
              {/* Top Rings Section */}
              <div className="flex justify-center space-x-8 mb-8">
                {/* Steps Ring */}
                <div 
                  className="text-center cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setActiveTab("activity")}
                >
                  <div className="relative w-24 h-24 mb-2">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#1A1A1A" strokeWidth="8" fill="none"/>
                      <circle 
                        cx="50" cy="50" r="40" 
                        stroke="var(--giddyup-success)" 
                        strokeWidth="8" 
                        fill="none"
                        strokeDasharray={`${(8030/10000) * 251.2} 251.2`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-white font-work font-bold text-lg">8,030</p>
                      <p className="text-gray-400 font-work text-xs">/10,000</p>
                    </div>
                  </div>
                  <p className="text-gray-400 font-work text-sm">STEPS</p>
                </div>

                {/* Sleep Ring */}
                <div 
                  className="text-center cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setActiveTab("sleep")}
                >
                  <div className="relative w-24 h-24 mb-2">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#1A1A1A" strokeWidth="8" fill="none"/>
                      <circle 
                        cx="50" cy="50" r="40" 
                        stroke="var(--giddyup-blue)" 
                        strokeWidth="8" 
                        fill="none"
                        strokeDasharray={`${(8/8) * 251.2} 251.2`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-white font-work font-bold text-lg">8:00</p>
                      <p className="text-gray-400 font-work text-xs">8:00</p>
                    </div>
                  </div>
                  <p className="text-gray-400 font-work text-sm">SLEEP</p>
                </div>
              </div>

              {/* Metabolic Age */}
              <div className="flex justify-center mb-8">
                <div className="text-center">
                  <div className="relative w-20 h-20 mb-2">
                    <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center">
                      <p className="text-white font-work font-bold text-2xl">34</p>
                    </div>
                  </div>
                  <p className="text-gray-400 font-work text-sm">Metabolic Age</p>
                </div>
              </div>

              {/* Feeling Ready Message */}
              <div className="bg-gray-800 rounded-2xl p-4 mb-8">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">😊</span>
                  <p className="text-white font-inter text-base">Feeling ready for exercise today.</p>
                </div>
              </div>

              {/* Bottom Rings */}
              <div className="flex justify-center space-x-8 mb-8">
                {/* Strain Ring */}
                <div 
                  className="text-center cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setActiveTab("strain")}
                >
                  <div className="relative w-24 h-24 mb-2">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#1A1A1A" strokeWidth="8" fill="none"/>
                      <circle 
                        cx="50" cy="50" r="40" 
                        stroke="#6B7280" 
                        strokeWidth="8" 
                        fill="none"
                        strokeDasharray={`${(7.7/20) * 251.2} 251.2`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white font-work font-bold text-2xl">7.7</p>
                    </div>
                  </div>
                  <p className="text-gray-400 font-work text-sm">STRAIN</p>
                </div>

                {/* Recovery Ring */}
                <div 
                  className="text-center cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setActiveTab("recovery")}
                >
                  <div className="relative w-24 h-24 mb-2">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#1A1A1A" strokeWidth="8" fill="none"/>
                      <circle 
                        cx="50" cy="50" r="40" 
                        stroke="var(--giddyup-success)" 
                        strokeWidth="8" 
                        fill="none"
                        strokeDasharray={`${(81/100) * 251.2} 251.2`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white font-work font-bold text-xl">81%</p>
                    </div>
                  </div>
                  <p className="text-gray-400 font-work text-sm">RECOVERY</p>
                </div>
              </div>

              {/* Bottom Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-white font-work font-bold text-lg">178 lb</p>
                  <p className="text-gray-400 font-work text-sm">Weight</p>
                  <div className="h-4 mt-1">
                    <svg className="w-full h-full" viewBox="0 0 60 16">
                      <path d="M0,8 Q15,6 30,7 T60,8" stroke="#6B7280" strokeWidth="2" fill="none"/>
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-work font-bold text-lg">46 ms</p>
                  <p className="text-gray-400 font-work text-sm">Resting HR</p>
                  <div className="h-4 mt-1">
                    <svg className="w-full h-full" viewBox="0 0 60 16">
                      <path d="M0,10 Q15,8 30,6 T60,4" stroke="#6B7280" strokeWidth="2" fill="none"/>
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-work font-bold text-lg">50 ms</p>
                  <p className="text-gray-400 font-work text-sm">HRV</p>
                  <div className="h-4 mt-1">
                    <svg className="w-full h-full" viewBox="0 0 60 16">
                      <path d="M0,12 Q15,10 30,8 T60,6" stroke="#6B7280" strokeWidth="2" fill="none"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "activity":
        return (
          <div className="bg-[var(--giddyup-primary)] min-h-screen px-6 py-6 space-y-6">
            {/* Main Activity Card - HIKING */}
            <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  {/* Hiking icon */}
                  <div className="text-white text-3xl">🥾</div>
                  <div>
                    <h2 className="text-white font-work font-bold text-xl">HIKING</h2>
                    <p className="text-gray-400 font-inter text-base">1 hr 45 min</p>
                    <p className="text-gray-400 font-inter text-sm mt-1">Avg HR  118 bpm</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 font-work text-sm mb-1">MODERATE</p>
                  <p className="text-green-400 font-work font-bold text-4xl">5,8</p>
                </div>
              </div>
            </div>

            {/* Recovery Text */}
            <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-4">
              <p className="text-white font-inter text-base">Good recovery after the last hike</p>
            </div>

            {/* Log Activity Button */}
            <div className="flex justify-center">
              <button className="bg-[var(--giddyup-card-bg)] rounded-2xl px-8 py-4 flex items-center space-x-3">
                <span className="text-white text-xl">+</span>
                <span className="text-white font-work font-medium text-lg">Log Activity</span>
              </button>
            </div>

            {/* PADEL Suggestion */}
            <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-6">
              <div className="flex items-start space-x-4">
                <div className="text-white text-2xl">🏓</div>
                <div className="flex-1">
                  <h3 className="text-white font-work font-bold text-lg mb-2">PADEL</h3>
                  <p className="text-gray-400 font-inter text-sm mb-3">
                    Detected 55 min of moderate activity. Log it?
                  </p>
                  <p className="text-gray-400 font-inter text-xs">
                    Yesterday, 6:03 PM  Avg HR  55 min
                  </p>
                </div>
              </div>
            </div>

            {/* THIS WEEK Section */}
            <div>
              <h2 className="text-white font-work font-bold text-lg mb-4 tracking-wide">THIS WEEK</h2>
              <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-white text-2xl">🚶</div>
                    <div>
                      <h3 className="text-white font-work font-bold text-lg">WALKING</h3>
                      <p className="text-gray-400 font-inter text-sm">Avg HR  102 bpm</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-work font-medium text-lg">30 min</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "sleep":
        return (
          <div className="bg-black min-h-screen">
            {/* Header */}
            <div className="flex items-center px-6 py-4 bg-black">
              <button onClick={() => setActiveTab("home")} className="text-white mr-4">
                <span className="text-lg">←</span>
              </button>
              <h1 className="text-white font-work font-medium text-lg">Sleep</h1>
            </div>

            <div className="px-6 py-6">
              {/* Sleep Icon and Duration */}
              <div className="flex items-center mb-8">
                <div className="bg-blue-600 rounded-xl p-3 mr-4">
                  <span className="text-white text-xl">🛏️</span>
                </div>
                <div>
                  <p className="text-white font-work font-bold text-4xl">7h 20m</p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-gray-400 font-work text-sm mb-1">Time in bed</p>
                  <p className="text-white font-work font-medium text-lg">85 m</p>
                </div>
                <div>
                  <p className="text-gray-400 font-work text-sm mb-1">Sleep efficiency</p>
                  <p className="text-white font-work font-medium text-lg">91 %</p>
                </div>
                <div>
                  <p className="text-gray-400 font-work text-sm mb-1">REM sleep</p>
                  <p className="text-white font-work font-medium text-lg">1h 40m</p>
                </div>
                <div>
                  <p className="text-gray-400 font-work text-sm mb-1">Deep sleep</p>
                  <p className="text-white font-work font-medium text-lg">1h 10m</p>
                </div>
              </div>

              {/* Strain Stages */}
              <div className="mb-8">
                <h3 className="text-white font-work font-medium text-lg mb-4">Strain Stages</h3>
                <div className="h-12 mb-4">
                  <svg className="w-full h-full" viewBox="0 0 400 50">
                    <path d="M0,30 Q50,25 100,30 T200,25 T300,35 T400,30" stroke="#00FFE0" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>T</span>
                  <span>M</span>
                  <span>W</span>
                  <span>T</span>
                  <span>F</span>
                  <span>S</span>
                  <span>D</span>
                </div>
              </div>

              {/* Strain by Day */}
              <div className="mb-8">
                <h3 className="text-white font-work font-medium text-lg mb-4">Strain by Day</h3>
                <div className="h-12 mb-4">
                  <svg className="w-full h-full" viewBox="0 0 400 50">
                    <path d="M0,35 Q50,30 100,25 T200,30 T300,25 T400,35" stroke="#60A5FA" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>T</span>
                  <span>M</span>
                  <span>T</span>
                  <span>M</span>
                  <span>J</span>
                  <span>J</span>
                  <span>S</span>
                  <span>D</span>
                </div>
              </div>

              {/* Bottom Navigation Tabs */}
              <div className="flex justify-center space-x-8 mt-12">
                <button 
                  onClick={() => setActiveTab("sleep")}
                  className="text-white font-work text-sm border-b-2 border-white pb-1"
                >
                  Sleep
                </button>
                <button 
                  onClick={() => setActiveTab("strain")}
                  className="text-gray-400 font-work text-sm"
                >
                  Strain
                </button>
                <button 
                  onClick={() => setActiveTab("nutrition")}
                  className="text-gray-400 font-work text-sm"
                >
                  Nuti
                </button>
              </div>
            </div>
          </div>
        );

      case "recovery":
        return (
          <div className="bg-black min-h-screen">
            {/* Header */}
            <div className="flex items-center px-6 py-4 bg-black">
              <button onClick={() => setActiveTab("home")} className="text-white mr-4">
                <span className="text-lg">←</span>
              </button>
              <h1 className="text-white font-work font-medium text-lg">Recovery</h1>
            </div>

            <div className="px-6 py-6">
              {/* Main Recovery Score */}
              <div className="mb-8">
                <div className="flex items-baseline mb-2">
                  <span className="text-green-400 text-2xl mr-2">▲</span>
                  <span className="text-green-400 font-work font-bold text-5xl">83%</span>
                </div>
                <p className="text-gray-400 font-work text-sm">↗ 10% from yesterday</p>
              </div>

              {/* Metrics Row */}
              <div className="flex justify-between mb-8">
                <div className="text-center">
                  <p className="text-gray-400 font-work text-sm mb-1">HRV</p>
                  <p className="text-white font-work font-bold text-lg">56 ms</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 font-work text-sm mb-1">RHR</p>
                  <p className="text-white font-work font-bold text-lg">58 bpm</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 font-work text-sm mb-1">Stress</p>
                  <p className="text-white font-work font-bold text-lg">12,3</p>
                </div>
              </div>

              {/* Sleep Stages */}
              <div className="mb-8">
                <h3 className="text-white font-work font-medium text-lg mb-4">Sleep Stages</h3>
                <div className="h-12 mb-4">
                  <svg className="w-full h-full" viewBox="0 0 400 50">
                    <path d="M0,25 Q50,30 100,25 T200,20 T300,25 T400,30" stroke="#00FFE0" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>T</span>
                  <span>M</span>
                  <span>T/</span>
                  <span>KM</span>
                  <span>L</span>
                  <span>II</span>
                  <span>D</span>
                  <span>D</span>
                </div>
              </div>

              {/* AI Insights */}
              <div className="mb-8">
                <h3 className="text-white font-work font-medium text-lg mb-3">AI Insights</h3>
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-white font-inter text-sm leading-relaxed mb-2">
                    You're trending better than 78% of users
                  </p>
                  <p className="text-gray-400 font-inter text-sm">
                    • Consider more sleep tonight
                  </p>
                </div>
              </div>

              {/* Bottom Navigation Tabs */}
              <div className="flex justify-center space-x-8 mt-12">
                <button 
                  onClick={() => setActiveTab("recovery")}
                  className="text-white font-work text-sm border-b-2 border-white pb-1"
                >
                  Recovery
                </button>
                <button 
                  onClick={() => setActiveTab("sleep")}
                  className="text-gray-400 font-work text-sm"
                >
                  Sleep
                </button>
                <button 
                  onClick={() => setActiveTab("strain")}
                  className="text-gray-400 font-work text-sm"
                >
                  Strain
                </button>
              </div>
            </div>
          </div>
        );

      case "coach":
        return (
          <div className="bg-black min-h-screen">
            <div className="px-6 py-6">
              {/* AI Message */}
              <div className="bg-gray-800 rounded-2xl p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">AI</span>
                  </div>
                  <p className="text-white font-inter text-base">
                    Hey, you're 92% recovered today – go train or do some light cardio
                  </p>
                </div>
              </div>

              {/* Green Line Separator */}
              <div className="h-1 bg-green-500 rounded-full mb-6"></div>

              {/* Main Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {/* Steps */}
                <div 
                  className="bg-gray-800 rounded-2xl p-4 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setActiveTab("activity")}
                >
                  <p className="text-gray-400 font-work text-sm mb-1">STEPS</p>
                  <p className="text-white font-work font-bold text-2xl">6,532</p>
                </div>

                {/* Sleep */}
                <div 
                  className="bg-gray-800 rounded-2xl p-4 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setActiveTab("sleep")}
                >
                  <p className="text-gray-400 font-work text-sm mb-1">SLEEP</p>
                  <p className="text-white font-work font-bold text-2xl">7:55</p>
                </div>

                {/* Heart Rate */}
                <div 
                  className="bg-gray-800 rounded-2xl p-4 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setActiveTab("vitals")}
                >
                  <p className="text-gray-400 font-work text-sm mb-1">HEART RATE</p>
                  <p className="text-white font-work font-bold text-2xl">62</p>
                </div>

                {/* Weight */}
                <div 
                  className="bg-gray-800 rounded-2xl p-4 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setActiveTab("metabolic")}
                >
                  <p className="text-gray-400 font-work text-sm mb-1">WEIGHT</p>
                  <p className="text-white font-work font-bold text-2xl">168.5 <span className="text-sm">lb</span></p>
                </div>

                {/* Metabolic Age */}
                <div 
                  className="bg-gray-800 rounded-2xl p-4 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setActiveTab("metabolic")}
                >
                  <p className="text-gray-400 font-work text-sm mb-1">METABOLIC AGE</p>
                  <p className="text-white font-work font-bold text-2xl">34</p>
                </div>

                {/* RHR */}
                <div 
                  className="bg-gray-800 rounded-2xl p-4 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setActiveTab("vitals")}
                >
                  <p className="text-gray-400 font-work text-sm mb-1">RHR</p>
                  <p className="text-white font-work font-bold text-xl">64 <span className="text-base ml-2">57ms</span></p>
                </div>
              </div>

              {/* Trends Section */}
              <div className="mb-8">
                <h2 className="text-white font-work font-bold text-lg mb-4">TRENDS</h2>
                <div className="grid grid-cols-2 gap-4">
                  {/* Strain Trend */}
                  <div 
                    className="bg-gray-800 rounded-2xl p-4 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setActiveTab("strain")}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 font-work text-sm mb-1">STRAIN</p>
                        <p className="text-white font-work font-bold text-2xl">12.3</p>
                      </div>
                      <div className="text-green-400">
                        <svg className="w-8 h-4" viewBox="0 0 32 16">
                          <path d="M0,8 Q8,6 16,4 T32,2" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Sleep Trend */}
                  <div 
                    className="bg-gray-800 rounded-2xl p-4 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setActiveTab("sleep")}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 font-work text-sm mb-1">SLEEP</p>
                        <p className="text-white font-work font-bold text-2xl">-0:15</p>
                      </div>
                      <div className="text-green-400">
                        <svg className="w-8 h-4" viewBox="0 0 32 16">
                          <path d="M0,12 Q8,10 16,8 T32,4" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Weight Trend */}
                  <div 
                    className="bg-gray-800 rounded-2xl p-4 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setActiveTab("metabolic")}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 font-work text-sm mb-1">WEIGHT</p>
                        <p className="text-white font-work font-bold text-2xl">168.5</p>
                      </div>
                      <div className="text-gray-400">
                        <svg className="w-8 h-4" viewBox="0 0 32 16">
                          <path d="M0,8 Q8,7 16,8 T32,8" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Metabolic Age Trend */}
                  <div 
                    className="bg-gray-800 rounded-2xl p-4 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setActiveTab("metabolic")}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 font-work text-sm mb-1">METABOLIC AGE</p>
                        <p className="text-white font-work font-bold text-2xl">34</p>
                      </div>
                      <div className="text-gray-400">
                        <svg className="w-8 h-4" viewBox="0 0 32 16">
                          <path d="M0,8 Q8,9 16,8 T32,8" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[var(--giddyup-accent)]/20 rounded-full">
                    <Bot className="w-5 h-5 text-[var(--giddyup-accent)]" />
                  </div>
                  <div>
                    <h3 className="font-work font-semibold">AI Health Coach</h3>
                    <p className="text-xs text-gray-400">Available 24/7 for personalized guidance</p>
                  </div>
                </div>
              </div>
              
              <div className="h-80 overflow-y-auto p-4 space-y-4">
                {(conversation.length > 0 ? conversation : chatHistory).map((message, index) => (
                  <div key={index} className={`flex items-start space-x-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'assistant' && (
                      <div className="p-1 bg-[var(--giddyup-accent)]/20 rounded-full mt-1">
                        <Bot className="w-3 h-3 text-[var(--giddyup-accent)]" />
                      </div>
                    )}
                    <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`${message.role === 'user' ? 'bg-[var(--giddyup-accent)]/20 rounded-2xl rounded-tr-sm' : 'bg-[var(--giddyup-primary)]/30 rounded-2xl rounded-tl-sm'} p-3 ${message.role === 'user' ? 'inline-block' : ''}`}>
                        <p className="text-sm text-gray-200">{message.content}</p>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 block">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {(conversation.length === 0 && chatHistory.length === 0) && (
                  <div className="text-center py-8 text-gray-400">
                    <Bot className="w-12 h-12 mx-auto mb-4 text-[var(--giddyup-accent)]" />
                    <p>Start a conversation with your AI health coach!</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[var(--giddyup-secondary)]/20">
                <div className="flex items-center space-x-3">
                  <Input
                    type="text"
                    placeholder="Ask your AI coach anything..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 bg-[var(--giddyup-primary)]/20 border border-[var(--giddyup-secondary)]/30 rounded-full focus:border-[var(--giddyup-accent)]/50"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    className="p-2 bg-[var(--giddyup-accent)] text-[var(--giddyup-primary)] rounded-full hover:bg-[var(--giddyup-accent)]/90"
                  >
                    <span className="sr-only">Send</span>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-6 border border-[var(--giddyup-secondary)]/10">
              <h3 className="font-work font-semibold text-lg mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleQuickAction('daily-summary')}
                  className="p-4 bg-[var(--giddyup-primary)]/20 rounded-xl border border-[var(--giddyup-accent)]/20 hover:bg-[var(--giddyup-primary)]/30 h-auto flex flex-col items-start text-left"
                >
                  <Zap className="w-5 h-5 text-[var(--giddyup-accent)] mb-2" />
                  <span className="text-sm font-medium">Daily Summary</span>
                </Button>
                <Button
                  onClick={() => handleQuickAction('workout-advice')}
                  className="p-4 bg-[var(--giddyup-primary)]/20 rounded-xl border border-[var(--giddyup-accent)]/20 hover:bg-[var(--giddyup-primary)]/30 h-auto flex flex-col items-start text-left"
                >
                  <Watch className="w-5 h-5 text-[var(--giddyup-accent)] mb-2" />
                  <span className="text-sm font-medium">Workout Advice</span>
                </Button>
                <Button
                  onClick={() => handleQuickAction('sleep-tips')}
                  className="p-4 bg-[var(--giddyup-primary)]/20 rounded-xl border border-[var(--giddyup-accent)]/20 hover:bg-[var(--giddyup-primary)]/30 h-auto flex flex-col items-start text-left"
                >
                  <Moon className="w-5 h-5 text-[var(--giddyup-accent)] mb-2" />
                  <span className="text-sm font-medium">Sleep Tips</span>
                </Button>
                <Button
                  onClick={() => handleQuickAction('recovery-plan')}
                  className="p-4 bg-[var(--giddyup-primary)]/20 rounded-xl border border-[var(--giddyup-accent)]/20 hover:bg-[var(--giddyup-primary)]/30 h-auto flex flex-col items-start text-left"
                >
                  <Heart className="w-5 h-5 text-[var(--giddyup-accent)] mb-2" />
                  <span className="text-sm font-medium">Recovery Plan</span>
                </Button>
              </div>
            </div>
          </div>
        );

      case "strain":
        return (
          <div className="bg-black min-h-screen">
            {/* Header */}
            <div className="flex items-center px-6 py-4 bg-black">
              <button onClick={() => setActiveTab("home")} className="text-white mr-4">
                <span className="text-lg">←</span>
              </button>
              <h1 className="text-white font-work font-medium text-lg">Strain</h1>
            </div>

            <div className="px-6 py-6">
              {/* Main Strain Score */}
              <div className="text-center mb-8">
                <p className="text-white font-work font-bold text-6xl">12.3</p>
                <p className="text-gray-400 font-work text-lg">Strain</p>
              </div>

              {/* Calories and Active Minutes */}
              <div className="flex items-center mb-8">
                <div className="flex items-center mr-8">
                  <span className="text-blue-400 text-xl mr-2">💧</span>
                  <div>
                    <p className="text-gray-400 font-work text-sm">Calories</p>
                    <p className="text-white font-work font-medium text-lg">950 kcal</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-400 text-xl mr-2">⏱️</span>
                  <div>
                    <p className="text-gray-400 font-work text-sm">Active minutes</p>
                    <p className="text-white font-work font-medium text-lg">85 min</p>
                  </div>
                </div>
              </div>

              {/* Strain Stages Chart */}
              <div className="mb-8">
                <h3 className="text-white font-work font-medium text-lg mb-4">Strain Stages</h3>
                <div className="h-16 mb-4">
                  <svg className="w-full h-full" viewBox="0 0 400 60">
                    <path d="M0,40 Q50,35 100,30 T200,25 T300,35 T400,40" stroke="#60A5FA" strokeWidth="3" fill="none"/>
                  </svg>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>T</span>
                  <span>M</span>
                  <span>W</span>
                  <span>T</span>
                  <span>F</span>
                  <span>S</span>
                  <span>D</span>
                </div>
              </div>

              {/* Strain by Day Chart */}
              <div className="mb-8">
                <h3 className="text-white font-work font-medium text-lg mb-4">Strain by Day</h3>
                <div className="h-16 mb-4">
                  <svg className="w-full h-full" viewBox="0 0 400 60">
                    <path d="M0,45 Q50,40 100,35 T200,30 T300,40 T400,45" stroke="#00FFE0" strokeWidth="3" fill="none"/>
                  </svg>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>T</span>
                  <span>M</span>
                  <span>T</span>
                  <span>M</span>
                  <span>J</span>
                  <span>J</span>
                  <span>S</span>
                  <span>D</span>
                </div>
              </div>

              {/* Bottom Navigation Tabs */}
              <div className="flex justify-center space-x-8 mt-12">
                <button 
                  onClick={() => setActiveTab("recovery")}
                  className="text-gray-400 font-work text-sm"
                >
                  Recovery
                </button>
                <button 
                  onClick={() => setActiveTab("sleep")}
                  className="text-gray-400 font-work text-sm"
                >
                  Sleep
                </button>
                <button 
                  onClick={() => setActiveTab("nutrition")}
                  className="text-gray-400 font-work text-sm"
                >
                  Nutrition
                </button>
              </div>
            </div>
          </div>
        );

      case "vitals":
        return (
          <div className="bg-[var(--giddyup-primary)] min-h-screen px-6 py-6">
            {/* Time Period Tabs */}
            <div className="flex justify-center mb-8">
              <div className="bg-[var(--giddyup-card-bg)] rounded-full px-6 py-3 flex space-x-8">
                <button className="text-gray-400 font-work font-medium text-lg">7D</button>
                <button className="text-white font-work font-medium text-lg">30D</button>
                <button className="text-gray-400 font-work font-medium text-lg">90D</button>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="space-y-4">
              {/* Weight */}
              <div className="bg-[var(--giddyup-card-bg)] p-6 rounded-2xl">
                <div className="flex items-end justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-work font-medium text-xl mb-4">Weight</h3>
                    <div className="h-12 w-40 mb-4">
                      <svg className="w-full h-full" viewBox="0 0 100 30">
                        <path d="M0,20 Q25,18 50,15 Q75,12 100,10" stroke="#F59E0B" strokeWidth="3" fill="none" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline">
                      <span className="text-white font-work font-bold text-4xl">220,4</span>
                      <span className="text-gray-400 font-work text-lg ml-2">lb</span>
                    </div>
                    <div className="text-red-400 font-work text-lg mt-2 flex items-center">
                      <span className="text-red-400 text-lg mr-1">▲</span>
                      <span>0,6 lb</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HRV */}
              <div className="bg-[var(--giddyup-card-bg)] p-6 rounded-2xl">
                <div className="flex items-end justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-work font-medium text-xl mb-4">HRV</h3>
                    <div className="h-12 w-40 mb-4">
                      <svg className="w-full h-full" viewBox="0 0 100 30">
                        <path d="M0,25 Q25,22 50,18 Q75,15 100,12" stroke="#10B981" strokeWidth="3" fill="none" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline">
                      <span className="text-white font-work font-bold text-4xl">66</span>
                      <span className="text-gray-400 font-work text-lg ml-2">ms</span>
                    </div>
                    <div className="text-green-400 font-work text-lg mt-2 flex items-center">
                      <span className="text-green-400 text-lg mr-1">▲</span>
                      <span>+5 ms</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body Fat */}
              <div className="bg-[var(--giddyup-card-bg)] p-6 rounded-2xl">
                <div className="flex items-end justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-work font-medium text-xl mb-4">Body Fat</h3>
                    <div className="h-12 w-40 mb-4">
                      <svg className="w-full h-full" viewBox="0 0 100 30">
                        <path d="M0,8 Q25,10 50,12 Q75,15 100,18" stroke="#3B82F6" strokeWidth="3" fill="none" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline">
                      <span className="text-white font-work font-bold text-4xl">24,3</span>
                      <span className="text-gray-400 font-work text-lg ml-2">%</span>
                    </div>
                    <div className="text-blue-400 font-work text-lg mt-2 flex items-center">
                      <span className="text-blue-400 text-lg mr-1">▼</span>
                      <span>- 0,4%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metabolic Age */}
              <div className="bg-[var(--giddyup-card-bg)] p-6 rounded-2xl">
                <div className="flex items-end justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-work font-medium text-xl mb-4">Metabolic Age</h3>
                    <div className="h-12 w-40 mb-4">
                      <svg className="w-full h-full" viewBox="0 0 100 30">
                        <path d="M0,18 Q25,15 50,12 Q75,10 100,8" stroke="#10B981" strokeWidth="3" fill="none" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline">
                      <span className="text-white font-work font-bold text-4xl">49</span>
                    </div>
                    <div className="text-green-400 font-work text-lg mt-2 flex items-center">
                      <span className="text-green-400 text-lg mr-1">▼</span>
                      <span>-1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Text */}
            <div className="mt-8 flex items-start space-x-3">
              <div className="text-blue-400 text-xl">📊</div>
              <div>
                <p className="text-gray-300 font-inter text-base leading-relaxed">
                  Over the past 30 days, your HRV improved 8%, while you lost 0.4% body fat. Keep up the great work.
                </p>
              </div>
            </div>
          </div>
        );

      case "metabolic":
        return (
          <div className="bg-[var(--giddyup-primary)] min-h-screen px-6 py-6">
            {/* Time Period Tabs */}
            <div className="flex space-x-8 mb-8">
              <button className="text-white font-work font-medium text-lg border-b-2 border-white pb-1">Week</button>
              <button className="text-gray-400 font-work font-medium text-lg">Month</button>
              <button className="text-gray-400 font-work font-medium text-lg">6 Months</button>
            </div>

            {/* Main Metabolic Age Ring */}
            <div className="flex justify-center mb-8">
              <div className="relative w-64 h-64">
                {/* Background circle */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#2C2C2E" strokeWidth="8" fill="none"/>
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    stroke="#10B981" 
                    strokeWidth="8" 
                    fill="none"
                    strokeDasharray="158"
                    strokeDashoffset="79"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-gray-400 font-work text-sm tracking-wider mb-2">METABOLIC AGE</p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-white font-work font-bold text-6xl">48</span>
                    <div className="text-right">
                      <span className="text-gray-400 font-work text-xl">50</span>
                      <span className="text-gray-400 text-sm ml-1">▼</span>
                    </div>
                  </div>
                  <p className="text-gray-400 font-work text-sm mt-1">Actual Age</p>
                </div>
              </div>
            </div>

            {/* Progress Text */}
            <div className="mb-8">
              <p className="text-gray-300 font-inter text-base leading-relaxed text-center">
                You've reduced your metabolic age by 2 years in the last 90 days. Keep up strength training and quality sleep.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 mb-8">
              <button className="flex-1 bg-[var(--giddyup-card-bg)] rounded-2xl py-4 px-6">
                <p className="text-white font-work font-bold text-lg">Pace of Aging</p>
              </button>
              <button className="flex-1 bg-[var(--giddyup-card-bg)] rounded-2xl py-4 px-6">
                <p className="text-white font-work font-bold text-sm tracking-wide">HOW CAN I LOWER IT?</p>
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Body Fat % */}
              <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-4">
                <h3 className="text-gray-400 font-work font-bold text-sm tracking-wider mb-2">BODY FAT %</h3>
                <div className="mb-2">
                  <span className="text-white font-work font-bold text-2xl">22,5</span>
                  <span className="text-white font-work text-lg ml-1">%</span>
                </div>
                <p className="text-green-400 font-work text-sm mb-2">Optimal: &lt; 20,0%</p>
                <div className="h-8">
                  <svg className="w-full h-full" viewBox="0 0 100 20">
                    <path d="M0,15 Q25,12 50,10 T100,8" stroke="#10B981" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
              </div>

              {/* Muscle Mass */}
              <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-4">
                <h3 className="text-gray-400 font-work font-bold text-sm tracking-wider mb-2">MUSCLE MASS</h3>
                <div className="mb-2">
                  <span className="text-white font-work font-bold text-2xl">71,2</span>
                  <span className="text-white font-work text-lg ml-1">kg</span>
                </div>
                <p className="text-gray-400 font-inter text-xs leading-tight">
                  High lean mass supports better metabolic health
                </p>
              </div>

              {/* Resting Heart Rate */}
              <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-4">
                <h3 className="text-gray-400 font-work font-bold text-sm tracking-wider mb-2">RESTING HEART RATE</h3>
                <div className="mb-2">
                  <span className="text-white font-work font-bold text-2xl">60</span>
                  <span className="text-white font-work text-lg ml-1">bpm</span>
                </div>
                <p className="text-green-400 font-work text-sm mb-2">Optimal: 50-60</p>
                <div className="h-8">
                  <svg className="w-full h-full" viewBox="0 0 100 20">
                    <path d="M0,12 Q25,10 50,8 T100,6" stroke="#10B981" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
              </div>

              {/* VO₂ Max */}
              <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-4">
                <h3 className="text-gray-400 font-work font-bold text-sm tracking-wider mb-2">VO₂ MAX</h3>
                <div className="mb-2">
                  <span className="text-white font-work font-bold text-2xl">48,2</span>
                  <span className="text-white font-work text-sm ml-1">ml/kg/min</span>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 font-work text-xs">BMR</p>
                  <p className="text-white font-work font-medium text-lg">1.870 <span className="text-gray-400 text-sm">kcal/day</span></p>
                </div>
              </div>
            </div>
          </div>
        );

      case "nutrition":
        return (
          <div className="bg-black min-h-screen">
            {/* Header */}
            <div className="flex items-center px-6 py-4 bg-black">
              <button onClick={() => setActiveTab("home")} className="text-white mr-4">
                <span className="text-lg">←</span>
              </button>
              <h1 className="text-white font-work font-medium text-lg">Nutrition</h1>
            </div>

            <div className="px-6 py-6">
              {/* Meal Photo */}
              <div className="mb-8">
                <div className="w-32 h-32 mx-auto bg-gray-800 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-green-600 to-yellow-600 flex items-center justify-center">
                    <span className="text-white text-4xl">🥗</span>
                  </div>
                </div>
              </div>

              {/* Macro Breakdown */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-gray-400 font-work text-sm mb-1">Calories</p>
                  <p className="text-white font-work font-bold text-2xl">520 kcal</p>
                </div>
                <div>
                  <p className="text-gray-400 font-work text-sm mb-1">Protein</p>
                  <p className="text-white font-work font-bold text-2xl">33 g</p>
                </div>
                <div>
                  <p className="text-gray-400 font-work text-sm mb-1">Carbs</p>
                  <p className="text-white font-work font-bold text-2xl">45 g</p>
                </div>
                <div>
                  <p className="text-gray-400 font-work text-sm mb-1">Fat</p>
                  <p className="text-white font-work font-bold text-2xl">20 g</p>
                </div>
              </div>

              {/* Weekly Average */}
              <div className="mb-8">
                <h3 className="text-white font-work font-medium text-lg mb-4">Weekly Average</h3>
                <div className="flex space-x-2">
                  <div className="w-8 h-16 bg-blue-400 rounded"></div>
                  <div className="w-8 h-20 bg-green-400 rounded"></div>
                  <div className="w-8 h-12 bg-gray-400 rounded"></div>
                  <div className="w-8 h-18 bg-orange-400 rounded"></div>
                  <div className="w-8 h-14 bg-gray-400 rounded"></div>
                  <div className="w-8 h-22 bg-orange-400 rounded"></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>T</span>
                  <span>T</span>
                  <span>T</span>
                  <span>M</span>
                  <span>T</span>
                  <span>E</span>
                </div>
              </div>

              {/* Bottom Navigation Tabs */}
              <div className="flex justify-center space-x-8 mt-12">
                <button 
                  onClick={() => setActiveTab("recovery")}
                  className="text-gray-400 font-work text-sm"
                >
                  Recovery
                </button>
                <button 
                  onClick={() => setActiveTab("strain")}
                  className="text-gray-400 font-work text-sm"
                >
                  Strain
                </button>
                <button 
                  onClick={() => setActiveTab("nutrition")}
                  className="text-white font-work text-sm border-b-2 border-white pb-1"
                >
                  Nutrition
                </button>
              </div>
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="px-4 py-6 space-y-6">
            <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-6 border border-[var(--giddyup-secondary)]/10">
              <h3 className="font-work font-semibold text-lg mb-4">Data Sync</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Google Drive Backup</p>
                    <p className="text-xs text-gray-400">Automatically backup your health data</p>
                  </div>
                  <Switch checked={userSettings?.driveBackupEnabled ?? false} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Health Connect Import</p>
                    <p className="text-xs text-gray-400">Sync with wearable devices</p>
                  </div>
                  <Button 
                    onClick={handleHealthConnectImport}
                    className="px-4 py-2 bg-[var(--giddyup-accent)] text-[var(--giddyup-primary)] rounded-lg font-medium hover:bg-[var(--giddyup-accent)]/90"
                  >
                    Import Now
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Manual Input Mode</p>
                    <p className="text-xs text-gray-400">Enable manual data entry</p>
                  </div>
                  <Switch checked={userSettings?.manualInputEnabled ?? false} />
                </div>
              </div>
            </div>

            <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-6 border border-[var(--giddyup-secondary)]/10">
              <h3 className="font-work font-semibold text-lg mb-4">Connected Devices</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[var(--giddyup-primary)]/20 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Watch className="w-5 h-5 text-[var(--giddyup-accent)]" />
                    <div>
                      <p className="font-medium">Mi Band 9</p>
                      <p className="text-xs text-gray-400">Connected via Health Connect</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-[var(--giddyup-success)] rounded-full"></div>
                    <span className="text-xs text-[var(--giddyup-success)]">Connected</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-[var(--giddyup-primary)]/20 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Watch className="w-5 h-5 text-[var(--giddyup-accent)]" />
                    <div>
                      <p className="font-medium">Renpho Scale</p>
                      <p className="text-xs text-gray-400">Body composition data</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-[var(--giddyup-success)] rounded-full"></div>
                    <span className="text-xs text-[var(--giddyup-success)]">Connected</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-6 border border-[var(--giddyup-secondary)]/10">
              <h3 className="font-work font-semibold text-lg mb-4">App Analytics</h3>
              <p className="text-sm text-gray-300 mb-4">View your app usage and engagement patterns</p>
              <Button 
                onClick={() => setActiveTab("usage")}
                className="w-full bg-[var(--giddyup-accent)] text-[var(--giddyup-primary)] hover:bg-[var(--giddyup-accent)]/90 mb-4"
              >
                View Weekly Usage
              </Button>
            </div>

            <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-6 border border-[var(--giddyup-secondary)]/10">
              <h3 className="font-work font-semibold text-lg mb-4">Data Export</h3>
              <p className="text-sm text-gray-300 mb-4">Export your health data for backup or analysis</p>
              <Button className="w-full bg-[var(--giddyup-secondary)] text-white hover:bg-[var(--giddyup-secondary)]/80">
                <Download className="w-4 h-4 mr-2" />
                Export All Data
              </Button>
            </div>
          </div>
        );

      case "usage":
        return (
          <div className="bg-[var(--giddyup-primary)] min-h-screen px-6 py-6">
            {/* Main Activity Ring */}
            <div className="flex justify-center mb-12">
              <div className="relative w-56 h-56">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="35" stroke="#2C2C2E" strokeWidth="8" fill="none"/>
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="35" 
                    stroke="#00FFE0" 
                    strokeWidth="8" 
                    fill="none"
                    strokeDasharray="220"
                    strokeDashoffset="40"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-white font-work font-medium text-lg mb-2">Activity</p>
                  <div className="text-center">
                    <span className="text-white font-work font-bold text-5xl">98</span>
                    <span className="text-gray-400 font-work text-xl ml-2">min</span>
                  </div>
                  <p className="text-gray-400 font-work text-sm mt-2">of 120 min goal</p>
                </div>
              </div>
            </div>

            {/* Two Smaller Rings */}
            <div className="flex justify-between mb-12">
              {/* Weight Measurements */}
              <div className="text-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="35" stroke="#2C2C2E" strokeWidth="8" fill="none"/>
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="35" 
                      stroke="#3B82F6" 
                      strokeWidth="8" 
                      fill="none"
                      strokeDasharray="220"
                      strokeDashoffset="110"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-white font-work font-medium text-sm mb-1">Weight</p>
                    <p className="text-white font-work font-medium text-sm mb-1">Measurements</p>
                    <span className="text-white font-work font-bold text-3xl">3</span>
                  </div>
                </div>
                <p className="text-gray-400 font-work text-sm">this week</p>
              </div>

              {/* Meals */}
              <div className="text-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="35" stroke="#2C2C2E" strokeWidth="8" fill="none"/>
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="35" 
                      stroke="#F97316" 
                      strokeWidth="8" 
                      fill="none"
                      strokeDasharray="220"
                      strokeDashoffset="165"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-white font-work font-medium text-lg mb-2">Meals</p>
                    <span className="text-white font-work font-bold text-3xl">4</span>
                  </div>
                </div>
                <p className="text-gray-400 font-work text-sm">this week</p>
              </div>
            </div>

            {/* Weekly Usage Section */}
            <div className="bg-[var(--giddyup-card-bg)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-work font-bold text-lg tracking-wider">WEEKLY USAGE</h2>
                <span className="text-gray-400 text-lg">▶</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                  <p className="text-gray-300 font-inter text-base">You surpassed the activity goal for 4 days</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                  <p className="text-gray-300 font-inter text-base">You averaged 3 weight measurements</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[var(--giddyup-dark-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--giddyup-dark-bg)]/95 backdrop-blur-sm border-b border-[var(--giddyup-secondary)]/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-work font-bold text-[var(--giddyup-accent)]">Giddyup</h1>
          <div className="flex items-center space-x-3">
            <button className="p-2 rounded-full bg-[var(--giddyup-card-bg)]/50 text-[var(--giddyup-accent)] hover:bg-[var(--giddyup-accent)]/10 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTab("settings")}
              className="p-2 rounded-full bg-[var(--giddyup-card-bg)]/50 text-[var(--giddyup-accent)] hover:bg-[var(--giddyup-accent)]/10 transition-colors"
            >
              <UserCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
