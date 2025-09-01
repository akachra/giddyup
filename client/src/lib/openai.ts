// Client-side OpenAI integration utilities
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface HealthContext {
  recoveryScore?: number;
  sleepScore?: number;
  strainScore?: number;
  restingHR?: number;
  hrv?: number;
  sleepDuration?: number;
}

export class AICoachClient {
  static async sendMessage(message: string): Promise<string> {
    try {
      const response = await fetch('/api/ai-coach/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error('Error sending message to AI coach:', error);
      throw new Error('Failed to get AI response. Please try again.');
    }
  }

  static async getDailySummary(): Promise<string> {
    try {
      const response = await fetch('/api/ai-coach/daily-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Error getting daily summary:', error);
      throw new Error('Failed to generate daily summary. Please try again.');
    }
  }

  static async getConversationHistory(): Promise<ChatMessage[]> {
    try {
      const response = await fetch('/api/ai-coach/conversation', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  static generatePrompt(action: string, context: HealthContext): string {
    const contextString = Object.entries(context)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    const prompts = {
      'daily-summary': `Based on my current health metrics (${contextString}), provide a brief daily summary with specific recommendations for today.`,
      'workout-advice': `Given my current recovery and health status (${contextString}), what type of workout should I do today?`,
      'sleep-tips': `Based on my recent sleep patterns (${contextString}), what specific tips can you give me to improve my sleep tonight?`,
      'recovery-plan': `With my current recovery metrics (${contextString}), what should I focus on to improve my recovery?`
    };

    return prompts[action as keyof typeof prompts] || action;
  }
}
