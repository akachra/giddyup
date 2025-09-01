import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white mb-4">
            GiddyUp Health
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            Your personal AI-powered health coach with sophisticated analytics, 
            GPT-5 enhanced insights, and comprehensive wellness tracking.
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-2">🏃‍♂️ Smart Tracking</h3>
              <p className="text-gray-400 text-sm">
                Comprehensive health metrics with authentic data from multiple sources
              </p>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-2">🧠 AI Coaching</h3>
              <p className="text-gray-400 text-sm">
                GPT-5 powered personalized recommendations that adapt to your daily patterns
              </p>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-2">📊 Deep Analytics</h3>
              <p className="text-gray-400 text-sm">
                Advanced insights into sleep, recovery, strain, and metabolic health
              </p>
            </div>
          </div>
          
          <Button 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold rounded-xl"
            onClick={() => window.location.href = '/api/login'}
          >
            Sign In to Get Started
          </Button>
          
          <p className="text-gray-500 text-sm">
            Secure authentication powered by Replit Auth
          </p>
        </div>
      </div>
    </div>
  );
}