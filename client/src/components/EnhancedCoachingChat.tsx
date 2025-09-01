import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Mic, MicOff, Brain, Heart, Moon, Zap, User } from 'lucide-react';
import { HapticButton } from './HapticFeedback';
import { useNotifications } from './PremiumNotifications';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    recoveryScore?: number;
    sleepData?: any;
    strainData?: any;
    heartRate?: number;
  };
}

interface CoachingInsight {
  type: 'tip' | 'warning' | 'celebration' | 'question';
  title: string;
  content: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface EnhancedCoachingChatProps {
  healthMetrics?: {
    recovery: number;
    sleep: number;
    strain: number;
    hrv: number;
  };
  onNavigate?: (tab: string) => void;
}

export const EnhancedCoachingChat: React.FC<EnhancedCoachingChatProps> = ({
  healthMetrics = { recovery: 85, sleep: 82, strain: 13.7, hrv: 49 },
  onNavigate
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversationContext, setConversationContext] = useState<any>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();

  // Initialize conversation with personalized greeting
  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm your AI health coach. I can see your recovery is at ${healthMetrics.recovery}% today. What would you like to focus on - optimizing your training, improving your sleep, or discussing your overall wellness strategy?`,
      timestamp: new Date(),
      context: healthMetrics
    };
    setMessages([welcomeMessage]);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate contextual coaching insights
  const generateCoachingInsights = (metrics: typeof healthMetrics): CoachingInsight[] => {
    const insights: CoachingInsight[] = [];

    // Recovery-based insights
    if (metrics.recovery < 40) {
      insights.push({
        type: 'warning',
        title: 'Low Recovery Detected',
        content: 'Your body needs more rest. Consider a light activity day or complete rest.',
        action: {
          label: 'View Recovery Tips',
          onClick: () => onNavigate?.('recovery')
        }
      });
    } else if (metrics.recovery > 80) {
      insights.push({
        type: 'celebration',
        title: 'Excellent Recovery!',
        content: 'Your body is primed for performance. Great day for a challenging workout!',
        action: {
          label: 'Explore Workouts',
          onClick: () => onNavigate?.('strain')
        }
      });
    }

    // Sleep-based insights
    if (metrics.sleep < 70) {
      insights.push({
        type: 'tip',
        title: 'Sleep Optimization',
        content: 'Your sleep quality could improve your recovery by 15-20%. Try going to bed 30 minutes earlier tonight.',
        action: {
          label: 'Sleep Analysis',
          onClick: () => onNavigate?.('sleep')
        }
      });
    }

    // HRV-based insights
    if (metrics.hrv < 35) {
      insights.push({
        type: 'question',
        title: 'Stress Check-in',
        content: 'Your HRV suggests elevated stress. How are you feeling mentally today?'
      });
    }

    return insights;
  };

  // Smart response generation with memory
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI processing with contextual awareness
    await new Promise(resolve => setTimeout(resolve, 1000));

    const insights = generateCoachingInsights(healthMetrics);
    const messageLower = userMessage.toLowerCase();

    // Context-aware responses
    if (messageLower.includes('sleep') || messageLower.includes('tired')) {
      return `Based on your ${healthMetrics.sleep}% sleep score, I can help optimize your rest. Your recovery would benefit from better sleep quality. Have you considered tracking your sleep environment factors like room temperature and light exposure?`;
    }
    
    if (messageLower.includes('workout') || messageLower.includes('train')) {
      if (healthMetrics.recovery > 70) {
        return `With your recovery at ${healthMetrics.recovery}%, you're ready for a solid training session! Your HRV of ${healthMetrics.hrv}ms suggests your body can handle moderate to high intensity. What type of workout interests you today?`;
      } else {
        return `Given your current recovery of ${healthMetrics.recovery}%, I'd recommend keeping today's training light. Focus on mobility, walking, or gentle yoga to support recovery.`;
      }
    }
    
    if (messageLower.includes('stress') || messageLower.includes('anxious')) {
      return `I notice your HRV is at ${healthMetrics.hrv}ms, which can indicate stress levels. Try some deep breathing exercises or a short meditation. Even 5 minutes can help improve your HRV and overall recovery.`;
    }
    
    if (messageLower.includes('heart rate') || messageLower.includes('hrv')) {
      return `Your current HRV of ${healthMetrics.hrv}ms tells us about your autonomic nervous system balance. Higher HRV generally indicates better recovery and stress resilience. Would you like specific strategies to improve it?`;
    }

    // Default contextual response
    return `I'm analyzing your current metrics: ${healthMetrics.recovery}% recovery, ${healthMetrics.sleep}% sleep quality, and ${healthMetrics.strain} strain. What specific aspect of your health would you like to optimize today?`;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Generate AI response with context
      const response = await generateAIResponse(content);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        context: healthMetrics
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update conversation context for memory
      setConversationContext(prev => ({
        ...prev,
        lastTopic: content,
        lastResponse: response,
        sessionLength: (prev.sessionLength || 0) + 1
      }));

    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Chat Error',
        message: 'Unable to get AI response. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Voice input simulation (would use Web Speech API in real implementation)
  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    
    if (!isListening) {
      addNotification({
        type: 'info',
        title: 'Voice Input Active',
        message: 'Speak now - I\'m listening to your health questions'
      });

      // Simulate voice recognition
      setTimeout(() => {
        setIsListening(false);
        setInputMessage('How can I improve my recovery score?');
      }, 3000);
    }
  };

  const getMessageIcon = (role: string) => {
    return role === 'assistant' ? (
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
        <Brain className="w-4 h-4 text-white" />
      </div>
    ) : (
      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
        <User className="w-4 h-4 text-white" />
      </div>
    );
  };

  const insights = generateCoachingInsights(healthMetrics);

  return (
    <div className="bg-black text-white rounded-2xl h-[600px] flex flex-col">
      {/* Header with Health Context */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <Bot className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-lg font-bold">AI Health Coach</h2>
            <p className="text-xs text-gray-400">Personalized insights based on your data</p>
          </div>
        </div>
        
        {/* Quick Health Status */}
        <div className="flex space-x-2">
          <div className="flex items-center space-x-1">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="text-sm">{healthMetrics.recovery}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <Moon className="w-4 h-4 text-blue-400" />
            <span className="text-sm">{healthMetrics.sleep}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm">{healthMetrics.strain}</span>
          </div>
        </div>
      </div>

      {/* Coaching Insights Bar */}
      {insights.length > 0 && (
        <div className="p-3 border-b border-gray-800">
          <div className="flex space-x-2 overflow-x-auto">
            {insights.slice(0, 2).map((insight, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={insight.action?.onClick}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs border ${
                  insight.type === 'warning' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                  insight.type === 'celebration' ? 'bg-green-500/10 border-green-500/30 text-green-300' :
                  insight.type === 'tip' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' :
                  'bg-purple-500/10 border-purple-500/30 text-purple-300'
                }`}
              >
                <div className="font-medium">{insight.title}</div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex space-x-3 ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              {getMessageIcon(message.role)}
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-gray-500 rounded-full"
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center space-x-2">
          <HapticButton
            onClick={toggleVoiceInput}
            hapticType="light"
            className={`p-2 rounded-full transition-colors ${
              isListening 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </HapticButton>
          
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputMessage)}
            placeholder="Ask about your health metrics, training, or wellness..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            disabled={isLoading}
          />
          
          <HapticButton
            onClick={() => sendMessage(inputMessage)}
            hapticType="medium"
            disabled={!inputMessage.trim() || isLoading}
            className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 rounded-full transition-colors"
          >
            <Send className="w-5 h-5 text-white" />
          </HapticButton>
        </div>
        
        {/* Quick suggestions */}
        <div className="flex space-x-2 mt-2 overflow-x-auto">
          {[
            'How can I improve recovery?',
            'Best workout for today?',
            'Sleep optimization tips',
            'Reduce stress levels'
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInputMessage(suggestion)}
              className="flex-shrink-0 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-xs text-gray-300 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};