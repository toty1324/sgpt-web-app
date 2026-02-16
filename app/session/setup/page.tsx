'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getClients, getEquipment } from '@/lib/supabase';

export default function SessionSetupPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [programs, setPrograms] = useState<Record<string, any>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
        const [clientsData, equipmentData, programsData] = await Promise.all([
            getClients(),
            getEquipment(),
            supabase.from('programs').select('*')
          ]);
          
          // Map programs by client_id
          const programsMap: Record<string, any> = {};
          programsData.data?.forEach(program => {
            if (!programsMap[program.client_id]) {
              programsMap[program.client_id] = [];
            }
            programsMap[program.client_id].push(program);
          });
          
          setPrograms(programsMap);
      setClients(clientsData);
      setEquipment(equipmentData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data. Check console for details.');
    } finally {
      setLoading(false);
    }
  }

  function toggleClient(clientId: string) {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    } else {
      if (selectedClients.length >= 6) {
        alert('Maximum 6 clients per session');
        return;
      }
      setSelectedClients([...selectedClients, clientId]);
    }
  }

  async function startSession() {
    if (selectedClients.length === 0) {
      alert('Please select at least one client');
      return;
    }

    setStarting(true);

    try {
      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          session_date: new Date().toISOString(),
          coach_name: 'Coach', // You can make this dynamic later
          status: 'active',
          duration_minutes: 60
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add participants
      const participants = selectedClients.map(clientId => {
        const clientPrograms = programs[clientId] || [];
        const latestProgram = clientPrograms[0]; // Get most recent program
        
        return {
          session_id: session.id,
          client_id: clientId,
          program_id: latestProgram?.id || null,
          checked_in: true
        };
      });

      const { error: participantsError } = await supabase
        .from('session_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      // Initialize session state for each client
      const sessionStates = selectedClients.map(clientId => ({
        session_id: session.id,
        client_id: clientId,
        current_exercise_index: 0,
        current_set: 1,
        status: 'ready',
        equipment_in_use: []
      }));

      const { error: stateError } = await supabase
        .from('session_state')
        .insert(sessionStates);

      if (stateError) throw stateError;

      // Navigate to live session
      router.push(`/session/live?id=${session.id}`);

    } catch (error: any) {
      console.error('Error starting session:', error);
      alert('Failed to start session: ' + error.message);
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Start New Session</h1>
          <p className="text-gray-400">Select clients to include in this session (max 6)</p>
        </div>

        {/* Selected count */}
        <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-blue-300 font-semibold">
                {selectedClients.length} / 6 clients selected
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {selectedClients.length === 0 && 'Select clients to begin'}
                {selectedClients.length > 0 && selectedClients.length < 6 && 'You can add more clients'}
                {selectedClients.length === 6 && 'Maximum capacity reached'}
              </div>
            </div>
            {selectedClients.length > 0 && (
              <button
                onClick={startSession}
                disabled={starting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {starting ? 'Starting...' : 'Start Session →'}
              </button>
            )}
          </div>
        </div>

        {/* Client selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Available Clients</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {clients.map((client) => {
              const isSelected = selectedClients.includes(client.id);
              return (
                <div
                  key={client.id}
                  onClick={() => toggleClient(client.id)}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${isSelected 
                      ? 'bg-blue-900/40 border-blue-500' 
                      : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-white font-semibold mb-1">{client.name}</div>
                      {client.current_injuries && (
                        <div className="text-red-400 text-sm mb-1">
                          ⚠️ {client.current_injuries}
                        </div>
                      )}
                      {client.injury_history && (
                        <div className="text-gray-400 text-sm">
                          History: {client.injury_history}
                        </div>
                      )}
                    </div>
                    <div className={`
                      w-6 h-6 rounded border-2 flex items-center justify-center
                      ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}
                    `}>
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Equipment overview */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Equipment Available</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {equipment.map((item) => (
              <div key={item.id} className="bg-gray-700 p-3 rounded text-center">
                <div className="text-white font-medium text-sm">{item.name}</div>
                <div className="text-gray-400 text-xs mt-1">Qty: {item.quantity}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
