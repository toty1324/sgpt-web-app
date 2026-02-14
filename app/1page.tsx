'use client';

import { useState } from 'react';

export default function Home() {
  const [clientName, setClientName] = useState('');
  const [scenario, setScenario] = useState('');
  const [equipment, setEquipment] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName,
          scenario,
          equipment,
          timeRemaining,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get decision');
      }

      setResponse(data.decision);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section with Background */}
      <div className="relative overflow-hidden">
        {/* Background Image Overlay */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)), url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        />
        
        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              RepWise AI
            </h1>
            <p className="text-2xl md:text-3xl text-blue-300 mb-4 font-light">
              The Operating System for Modern Coaching
            </p>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              AI-powered decision engine that enables trainers to deliver truly individualized 
              coaching at small-group economics
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="#demo" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Try Live Demo
              </a>
              <a 
                href="#problem" 
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 backdrop-blur-sm border border-white/20"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-800 border-y border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">6x</div>
              <div className="text-gray-400">Clients Per Trainer</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">50-70%</div>
              <div className="text-gray-400">Cost Reduction</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">3x</div>
              <div className="text-gray-400">Trainer Revenue</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">75%+</div>
              <div className="text-gray-400">Client Retention</div>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Section */}
      <div id="problem" className="bg-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">The Market Gap</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Fitness training is trapped in a false dichotomy
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Group Classes */}
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-8">
              <div className="text-red-400 text-5xl mb-4">❌</div>
              <h3 className="text-2xl font-bold text-white mb-4">Generic Group Classes</h3>
              <div className="space-y-3 text-gray-300">
                <p>• $20-30 per session</p>
                <p>• One-size-fits-all programming</p>
                <p>• 50-60% dropout rate</p>
                <p>• No personalization for injuries or goals</p>
              </div>
            </div>

            {/* Personal Training */}
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-8">
              <div className="text-red-400 text-5xl mb-4">❌</div>
              <h3 className="text-2xl font-bold text-white mb-4">One-on-One Training</h3>
              <div className="space-y-3 text-gray-300">
                <p>• $75-100 per session</p>
                <p>• Fully personalized</p>
                <p>• Unaffordable for most</p>
                <p>• Trainers can't scale income</p>
              </div>
            </div>
          </div>

          {/* Solution */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-10 text-center">
            <div className="text-white text-6xl mb-4">✓</div>
            <h3 className="text-3xl font-bold text-white mb-4">RepWise AI: The Third Way</h3>
            <p className="text-xl text-blue-100 mb-6 max-w-2xl mx-auto">
              6 clients, 6 individualized programs, 1 trainer, 1 session.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="font-semibold text-white mb-2">For Clients:</div>
                <div className="text-blue-100 text-sm">$35-40/session for personalized coaching</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="font-semibold text-white mb-2">For Trainers:</div>
                <div className="text-blue-100 text-sm">$240/hour vs $80 with one-on-one</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="font-semibold text-white mb-2">For Gyms:</div>
                <div className="text-blue-100 text-sm">Higher retention + revenue per sqft</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-800 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How RepWise AI Works</h2>
            <p className="text-xl text-gray-400">Real-time intelligence for every decision</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-gray-900 rounded-xl p-8 border border-gray-700 hover:border-blue-500 transition-all duration-200">
              <div className="bg-blue-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                1
              </div>
              <h3 className="text-xl font-bold text-white mb-3 text-center">Live Session Context</h3>
              <p className="text-gray-400 text-center leading-relaxed">
                Coach inputs: injury flags, equipment conflicts, client fatigue, time constraints
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-900 rounded-xl p-8 border border-gray-700 hover:border-blue-500 transition-all duration-200">
              <div className="bg-blue-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                2
              </div>
              <h3 className="text-xl font-bold text-white mb-3 text-center">AI Logic Engine</h3>
              <p className="text-gray-400 text-center leading-relaxed">
                Rule-based system applies injury regressions, equipment substitutions, rest timing protocols
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-900 rounded-xl p-8 border border-gray-700 hover:border-blue-500 transition-all duration-200">
              <div className="bg-blue-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                3
              </div>
              <h3 className="text-xl font-bold text-white mb-3 text-center">Instant Decision</h3>
              <p className="text-gray-400 text-center leading-relaxed">
                Coach receives actionable recommendation with rationale in {'<3'} seconds
              </p>
            </div>
          </div>

          {/* Example Flow */}
          <div className="mt-12 bg-gray-900 rounded-xl p-8 border border-blue-500/30">
            <div className="text-sm text-blue-400 font-semibold mb-2">REAL EXAMPLE:</div>
            <div className="grid md:grid-cols-3 gap-6 items-center">
              <div>
                <div className="text-gray-400 text-sm mb-1">INPUT:</div>
                <div className="text-white">"Client B: knee pain during lunges, trap bar occupied, 15 mins left"</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 text-2xl">→</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">OUTPUT:</div>
                <div className="text-white">"Switch to TRX-assisted lunge (knee-safe) + resequence Client C to KB deadlift (trap bar conflict)"</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Now Section */}
      <div className="bg-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Why Now?</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Market Tailwinds</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Small group training adoption accelerating (75%+ retention vs 50-60% for group classes)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>AI personalization becoming table stakes across fitness</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Trainers seeking income scalability without sacrificing quality</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Consumers demand personalization but can't afford 1-on-1 rates</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Technical Moat</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Real-time multi-client coordination (not just workout generation)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Equipment conflict resolution across 6 simultaneous programs</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Rule-based escalation protocol for safety-critical decisions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Designed for coach augmentation, not replacement</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Live Demo Section */}
      <div id="demo" className="bg-gradient-to-br from-gray-800 to-gray-900 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Try The Decision Engine</h2>
            <p className="text-xl text-gray-400">See how RepWise AI handles real coaching scenarios</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700">
            {/* Client Name */}
            <div className="mb-6">
              <label htmlFor="clientName" className="block text-sm font-semibold text-gray-300 mb-2">
                Client Name
              </label>
              <input
                type="text"
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., Client A"
              />
            </div>

            {/* Scenario */}
            <div className="mb-6">
              <label htmlFor="scenario" className="block text-sm font-semibold text-gray-300 mb-2">
                Scenario <span className="text-red-400">*</span>
              </label>
              <textarea
                id="scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                required
                rows={6}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Example:&#10;&#10;Client reports anterior knee pain during reverse lunges.&#10;Current exercise: Reverse lunges 3x8&#10;Session phase: Strength block&#10;Client goal: Hypertrophy&#10;Equipment available: Dumbbells, TRX, bench"
              />
            </div>

            {/* Equipment Status */}
            <div className="mb-6">
              <label htmlFor="equipment" className="block text-sm font-semibold text-gray-300 mb-2">
                Equipment Status
              </label>
              <input
                type="text"
                id="equipment"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., Trap bar occupied, DBs available"
              />
            </div>

            {/* Time Remaining */}
            <div className="mb-8">
              <label htmlFor="timeRemaining" className="block text-sm font-semibold text-gray-300 mb-2">
                Time Remaining (minutes)
              </label>
              <input
                type="number"
                id="timeRemaining"
                value={timeRemaining}
                onChange={(e) => setTimeRemaining(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., 15"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !scenario}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                'Get Decision'
              )}
            </button>
          </form>

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-900/30 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-red-200 font-medium">⚠️ {error}</p>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-green-500/30 animate-fadeIn">
              <div className="flex items-center mb-4">
                <div className="bg-green-500 w-3 h-3 rounded-full mr-3 animate-pulse"></div>
                <h3 className="text-2xl font-bold text-white">AI Decision</h3>
              </div>
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <p className="text-gray-100 whitespace-pre-wrap leading-relaxed text-lg">{response}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-950 border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">RepWise AI</h3>
              <p className="text-gray-400">
                Making individualized coaching accessible at group economics.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#demo" className="hover:text-white transition-colors">Live Demo</a></li>
                <li><a href="#problem" className="hover:text-white transition-colors">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Status</h4>
              <div className="space-y-2 text-gray-400">
                <div className="flex items-center">
                  <div className="bg-yellow-500 w-2 h-2 rounded-full mr-2"></div>
                  <span>Beta Testing Phase</span>
                </div>
                <div className="text-sm">Pilot programs launching Q1 2025</div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
            <p>© 2025 RepWise AI. Powered by GPT-4.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
