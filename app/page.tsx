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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            SGPT AI Decision Engine
          </h1>
          <p className="text-gray-400">Real-time coaching decisions for small group training</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-2xl p-6 mb-6">
          {/* Client Name */}
          <div className="mb-4">
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-300 mb-2">
              Client Name
            </label>
            <input
              type="text"
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Client A"
            />
          </div>

          {/* Scenario (Main Input) */}
          <div className="mb-4">
            <label htmlFor="scenario" className="block text-sm font-medium text-gray-300 mb-2">
              Issue / Scenario <span className="text-red-400">*</span>
            </label>
            <textarea
              id="scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              required
              rows={6}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the situation...&#10;&#10;Example:&#10;Client reports knee pain during reverse lunges.&#10;Current exercise: Reverse lunges 3x8&#10;Session phase: Strength block&#10;Client goal: Hypertrophy"
            />
          </div>

          {/* Equipment Status */}
          <div className="mb-4">
            <label htmlFor="equipment" className="block text-sm font-medium text-gray-300 mb-2">
              Equipment Status (Optional)
            </label>
            <input
              type="text"
              id="equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Trap bar occupied, DBs available"
            />
          </div>

          {/* Time Remaining */}
          <div className="mb-6">
            <label htmlFor="timeRemaining" className="block text-sm font-medium text-gray-300 mb-2">
              Time Remaining (minutes)
            </label>
            <input
              type="number"
              id="timeRemaining"
              value={timeRemaining}
              onChange={(e) => setTimeRemaining(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 15"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !scenario}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
          >
            {loading ? 'Getting Decision...' : 'Get Decision'}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-200 font-medium">Error: {error}</p>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="bg-gray-800 rounded-lg shadow-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="bg-green-500 w-3 h-3 rounded-full mr-2"></span>
              Decision
            </h2>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-100 whitespace-pre-wrap leading-relaxed">{response}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          SGPT AI • Powered by GPT-4
        </div>
      </div>
    </div>
  );
}