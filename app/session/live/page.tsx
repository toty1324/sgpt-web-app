'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LiveSessionPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id');
  
  const [session, setSession] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [sessionStates, setSessionStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(60);

  // Decision form states
  const [decisionClient, setDecisionClient] = useState('');
  const [decisionScenario, setDecisionScenario] = useState('');
  const [decisionResponse, setDecisionResponse] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    loadSessionData();

    // Subscribe to real-time updates
    const stateSubscription = supabase
      .channel('session_state_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_state',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          loadSessionData();
        }
      )
      .subscribe();

    return () => {
      stateSubscription.unsubscribe();
    };
  }, [sessionId]);

  // Timer countdown
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(() => {
      const start = new Date(session.session_date);
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
      const remaining = session.duration_minutes - elapsed;
      setTimeRemaining(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  async function loadSessionData() {
    try {
      // Get session with participants
      const { data: sessionData } = await supabase
        .from('sessions')
        .select(`
          *,
          session_participants (
            id,
            client_id,
            checked_in,
            clients (*)
          )
        `)
        .eq('id', sessionId)
        .single();

      setSession(sessionData);
      
      const clientsList = sessionData?.session_participants?.map((p: any) => p.clients) || [];
      setClients(clientsList);

      // Get session states
      const { data: states } = await supabase
        .from('session_state')
        .select('*')
        .eq('session_id', sessionId);

      setSessionStates(states || []);

      // Get equipment and calculate availability
      const { data: equipmentData } = await supabase
        .from('equipment')
        .select('*');

      // Calculate what's in use
      const inUse: Record<string, number> = {};
      states?.forEach(state => {
        state.equipment_in_use?.forEach((equip: string) => {
          inUse[equip] = (inUse[equip] || 0) + 1;
        });
      });

      const equipmentWithStatus = equipmentData?.map(item => ({
        ...item,
        inUse: inUse[item.name] || 0,
        available: item.quantity - (inUse[item.name] || 0)
      }));

      setEquipment(equipmentWithStatus || []);

    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  }

  async function getDecision() {
    if (!decisionScenario) {
      alert('Please enter a scenario');
      return;
    }

    setDecisionLoading(true);
    setDecisionResponse('');

    try {
      const response = await fetch('/api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: decisionClient,
          scenario: decisionScenario,
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      setDecisionResponse(data.decision);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setDecisionLoading(false);
    }
  }

  async function endSession() {
    if (!confirm('Are you sure you want to end this session?')) return;

    try {
      await supabase
        .from('sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);

      window.location.href = '/session/setup';
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Failed to end session');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Session not found</div>
          <a href="/session/setup" className="text-blue-400 hover:underline">
            Start a new session
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Live Session</h1>
            <div className="text-gray-400 text-sm mt-1">
              {clients.length} clients • Started {new Date(session.session_date).toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Time Remaining</div>
              <div className={`text-2xl font-bold ${timeRemaining < 10 ? 'text-red-400' : 'text-green-400'}`}>
                {timeRemaining} min
              </div>
            </div>
            <button
              onClick={endSession}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold"
            >
              End Session
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left: Clients */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-bold text-white mb-4">Active Clients</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {clients.map((client) => {
                  const state = sessionStates.find(s => s.client_id === client.id);
                  return (
                    <div key={client.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-white font-semibold">{client.name}</div>
                        <div className={`
                          px-2 py-1 rounded text-xs font-semibold
                          ${state?.status === 'active' ? 'bg-green-600' : ''}
                          ${state?.status === 'resting' ? 'bg-yellow-600' : ''}
                          ${state?.status === 'ready' ? 'bg-gray-600' : ''}
                        `}>
                          {state?.status?.toUpperCase() || 'READY'}
                        </div>
                      </div>

                      {client.current_injuries && (
                        <div className="bg-red-900/30 border border-red-600 rounded p-2 mb-3">
                          <div className="text-red-400 text-sm">⚠️ {client.current_injuries}</div>
                        </div>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Exercise:</span>
                          <span className="text-white">#{state?.current_exercise_index || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Set:</span>
                          <span className="text-white">{state?.current_set || 1}</span>
                        </div>
                        {state?.rpe && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">RPE:</span>
                            <span className={`font-semibold ${state.rpe >= 9 ? 'text-red-400' : 'text-white'}`}>
                              {state.rpe}
                            </span>
                          </div>
                        )}
                        {state?.equipment_in_use && state.equipment_in_use.length > 0 && (
                          <div className="mt-2">
                            <div className="text-gray-400 text-xs mb-1">Using:</div>
                            <div className="flex flex-wrap gap-1">
                              {state.equipment_in_use.map((equip: string, i: number) => (
                                <span key={i} className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs">
                                  {equip}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Decision Engine */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-bold text-white mb-4">Quick Decision</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Client</label>
                  <select
                    value={decisionClient}
                    onChange={(e) => setDecisionClient(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="">Select client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.name}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Scenario</label>
                  <textarea
                    value={decisionScenario}
                    onChange={(e) => setDecisionScenario(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Describe the issue..."
                  />
                </div>
                <button
                  onClick={getDecision}
                  disabled={decisionLoading || !decisionScenario}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded font-semibold"
                >
                  {decisionLoading ? 'Getting Decision...' : 'Get AI Decision'}
                </button>

                {decisionResponse && (
                  <div className="bg-gray-700 rounded p-3 mt-3">
                    <div className="text-sm font-semibold text-green-400 mb-2">AI Decision:</div>
                    <div className="text-white text-sm whitespace-pre-wrap">{decisionResponse}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Equipment */}
          <div className="bg-gray-800 rounded-lg p-4 h-fit">
            <h2 className="text-xl font-bold text-white mb-4">Equipment Status</h2>
            <div className="space-y-2">
              {equipment.map((item) => (
                <div key={item.id} className="bg-gray-700 rounded p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-medium text-sm">{item.name}</span>
                    <span className={`
                      text-xs font-semibold px-2 py-1 rounded
                      ${item.available > 0 ? 'bg-green-600' : 'bg-red-600'}
                    `}>
                      {item.available > 0 ? 'AVAILABLE' : 'IN USE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(item.inUse / item.quantity) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">
                      {item.inUse}/{item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}