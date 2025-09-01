import { Home, Zap, Moon, Heart, Bot, TrendingUp, Scale, Settings } from "lucide-react";

type TabType = "dashboard" | "sleep" | "strain" | "coach" | "vitals" | "metabolic" | "activity" | "nutrition" | "settings" | "recovery" | "sleep-details" | "activity-log" | "metric-details" | "mopup-breakdown" | "log-activity" | "recovery-breakdown";

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: "dashboard" as TabType, icon: Home, label: "Home" },
    { id: "sleep" as TabType, icon: Moon, label: "Sleep" },
    { id: "strain" as TabType, icon: Zap, label: "Strain" },
    { id: "vitals" as TabType, icon: Heart, label: "Vitals" },
    { id: "metabolic" as TabType, icon: Scale, label: "Metabolic" },
    { id: "coach" as TabType, icon: Bot, label: "Coach" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-[var(--giddyup-card-bg)]/95 backdrop-blur-sm border-t border-[var(--giddyup-secondary)]/20 px-2 py-2">
      <div className="grid grid-cols-7 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                isActive
                  ? "tab-active"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="mobile-text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
        
        {/* Settings Button */}
        <a
          href="/settings"
          className="flex flex-col items-center py-2 px-1 rounded-lg transition-all text-gray-400 hover:text-white"
        >
          <Settings className="w-5 h-5 mb-1" />
          <span className="mobile-text-sm font-medium">Settings</span>
        </a>
      </div>
    </nav>
  );
}
