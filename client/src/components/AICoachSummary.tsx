import { useQuery } from "@tanstack/react-query";
import { Bot, ArrowRight } from "lucide-react";

export default function AICoachSummary() {
  const { data: summary } = useQuery({
    queryKey: ["/api/ai-coach/daily-summary"],
    queryFn: async () => {
      const response = await fetch("/api/ai-coach/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch summary");
      return response.json();
    },
  });

  const defaultMessage = "Import Health Connect data to receive personalized AI coaching based on your recovery, sleep quality, and activity patterns.";

  return (
    <div className="bg-gradient-to-r from-[var(--giddyup-primary)] to-[var(--giddyup-secondary)] rounded-2xl p-6 border border-[var(--giddyup-accent)]/20">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-[var(--giddyup-accent)]/20 rounded-full">
          <Bot className="w-4 h-4 text-[var(--giddyup-accent)]" />
        </div>
        <div className="flex-1">
          <h3 className="font-work font-semibold text-[var(--giddyup-accent)] mb-2">AI Coach Insight</h3>
          <p className="text-sm text-gray-200 leading-relaxed">
            {summary?.summary || defaultMessage}
          </p>
          <button className="mt-3 text-xs text-[var(--giddyup-accent)] hover:text-white transition-colors flex items-center space-x-1">
            <span>Chat with Coach</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
