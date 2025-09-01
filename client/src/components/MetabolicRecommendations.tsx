import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight, Target, TrendingUp, Clock, Trophy } from "lucide-react";

interface MetabolicRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'Body Composition' | 'Cardiovascular' | 'Sleep' | 'Recovery' | 'Activity';
  title: string;
  description: string;
  currentValue: string;
  targetValue: string;
  potentialImprovement: string;
  actionSteps: string[];
  timeframe: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
}

interface PersonalizedMetabolicAdvice {
  currentMetabolicAge: number;
  actualAge: number;
  potentialImprovement: number;
  priorityRecommendations: MetabolicRecommendation[];
  secondaryRecommendations: MetabolicRecommendation[];
  strengthsToMaintain: string[];
  overallStrategy: string;
}

interface MetabolicRecommendationsProps {
  onNavigate?: (tab: string) => void;
}

export function MetabolicRecommendations({ onNavigate }: MetabolicRecommendationsProps) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const { data: advice, isLoading } = useQuery<PersonalizedMetabolicAdvice>({
    queryKey: ['/api/metabolic-recommendations'],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="bg-black min-h-screen px-4 pt-8 pb-24">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-800 rounded mb-4"></div>
          <div className="h-4 bg-gray-800 rounded mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-800 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!advice) {
    return (
      <div className="bg-black min-h-screen px-4 pt-8 pb-24">
        <div className="text-center py-12">
          <h1 className="text-white font-work font-bold text-2xl mb-4">
            Unable to Generate Recommendations
          </h1>
          <p className="text-gray-400 mb-6">
            Import more health data to get personalized metabolic age advice.
          </p>
          <button
            onClick={() => onNavigate?.('dashboard')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'border-red-500/50 bg-red-500/10';
      case 'MEDIUM': return 'border-yellow-500/50 bg-yellow-500/10';
      case 'LOW': return 'border-blue-500/50 bg-blue-500/10';
      default: return 'border-gray-500/50 bg-gray-500/10';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '🟢';
      case 'Moderate': return '🟡';
      case 'Challenging': return '🔴';
      default: return '⚪';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Body Composition': return '💪';
      case 'Cardiovascular': return '❤️';
      case 'Sleep': return '😴';
      case 'Recovery': return '🔄';
      case 'Activity': return '🏃';
      default: return '📊';
    }
  };

  return (
    <div className="bg-black min-h-screen px-4 pt-8 pb-24">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-white font-work font-bold text-2xl mb-2 uppercase tracking-wide">
          How to Lower Your Metabolic Age
        </h1>
        <p className="text-gray-400 mb-4">
          Personalized recommendations based on your current health metrics
        </p>
        <div className="flex items-center justify-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-300">Current: {advice.currentMetabolicAge} years</span>
          </div>
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">Potential: -{advice.potentialImprovement} years</span>
          </div>
        </div>
      </div>

      {/* Overall Strategy */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl border border-blue-500/30 p-6 mb-6">
        <div className="flex items-start space-x-3">
          <TrendingUp className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-white font-work font-bold text-lg mb-2">Your Strategy</h3>
            <p className="text-gray-300 leading-relaxed">{advice.overallStrategy}</p>
          </div>
        </div>
      </div>

      {/* Strengths to Maintain */}
      {advice.strengthsToMaintain.length > 0 && (
        <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-2xl border border-green-500/30 p-6 mb-6">
          <div className="flex items-start space-x-3">
            <Trophy className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-white font-work font-bold text-lg mb-3">Your Strengths</h3>
              <div className="space-y-2">
                {advice.strengthsToMaintain.map((strength, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                    <span className="text-green-300 text-sm">{strength}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Priority Recommendations */}
      {advice.priorityRecommendations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-white font-work font-bold text-xl mb-4 flex items-center space-x-2">
            <span className="text-red-400">🔥</span>
            <span>Priority Focus Areas</span>
          </h2>
          <div className="space-y-4">
            {advice.priorityRecommendations.map((rec, index) => (
              <RecommendationCard
                key={index}
                recommendation={rec}
                index={index}
                isExpanded={expandedCard === index}
                onToggle={() => setExpandedCard(expandedCard === index ? null : index)}
                getPriorityColor={getPriorityColor}
                getDifficultyIcon={getDifficultyIcon}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        </div>
      )}

      {/* Secondary Recommendations */}
      {advice.secondaryRecommendations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-white font-work font-bold text-xl mb-4 flex items-center space-x-2">
            <span className="text-blue-400">📈</span>
            <span>Additional Improvements</span>
          </h2>
          <div className="space-y-4">
            {advice.secondaryRecommendations.map((rec, index) => (
              <RecommendationCard
                key={index + 1000}
                recommendation={rec}
                index={index + 1000}
                isExpanded={expandedCard === index + 1000}
                onToggle={() => setExpandedCard(expandedCard === index + 1000 ? null : index + 1000)}
                getPriorityColor={getPriorityColor}
                getDifficultyIcon={getDifficultyIcon}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="text-center mt-8">
        <button
          onClick={() => onNavigate?.('metabolic')}
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          Back to Metabolic Health
        </button>
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: MetabolicRecommendation;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  getPriorityColor: (priority: string) => string;
  getDifficultyIcon: (difficulty: string) => string;
  getCategoryIcon: (category: string) => string;
}

function RecommendationCard({
  recommendation,
  index,
  isExpanded,
  onToggle,
  getPriorityColor,
  getDifficultyIcon,
  getCategoryIcon
}: RecommendationCardProps) {
  return (
    <div className={`rounded-2xl border-2 transition-all duration-300 ${getPriorityColor(recommendation.priority)}`}>
      <div
        className="p-6 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-xl">{getCategoryIcon(recommendation.category)}</span>
              <h3 className="text-white font-work font-bold text-lg">{recommendation.title}</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs">{getDifficultyIcon(recommendation.difficulty)}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  recommendation.priority === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                  recommendation.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}>
                  {recommendation.priority}
                </span>
              </div>
            </div>
            
            <p className="text-gray-300 text-sm mb-3">{recommendation.description}</p>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Current</p>
                <p className="text-white font-medium">{recommendation.currentValue}</p>
              </div>
              <div>
                <p className="text-gray-500">Target</p>
                <p className="text-green-400 font-medium">{recommendation.targetValue}</p>
              </div>
              <div>
                <p className="text-gray-500">Improvement</p>
                <p className="text-blue-400 font-medium">{recommendation.potentialImprovement}</p>
              </div>
            </div>
          </div>
          
          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-700/50 p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="w-4 h-4 text-blue-400" />
                <h4 className="text-white font-medium">Timeline</h4>
              </div>
              <p className="text-gray-300 text-sm">{recommendation.timeframe}</p>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                <Target className="w-4 h-4 text-green-400" />
                <span>Action Steps</span>
              </h4>
              <div className="space-y-2">
                {recommendation.actionSteps.map((step, stepIndex) => (
                  <div key={stepIndex} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-300 text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetabolicRecommendations;