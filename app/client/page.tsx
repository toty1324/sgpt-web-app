'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ClientPage() {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [sessionState, setSessionState] = useState<any>(null);
  const [currentExercise, setCurrentExercise] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveSession();
  }, []);

  // Subscribe to real-time updates for this client
  useEffect(() => {
    if (!selectedClient || !activeSession) return;

    const subscription = supabase
      .channel('client_state_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_state',
          filter: `client_id=eq.${selectedClient.id}`
        },
        (payload) => {
          setSessionState(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedClient, activeSession]);

  // Load current exercise details whenever session state changes
  useEffect(() => {
    if (!sessionState || !activeSession || !selectedClient) return;

    async function loadExerciseDetails() {
      try {
        // Get client's program
        const { data: participant } = await supabase
          .from('session_participants')
          .select('program_id, programs(exercises)')
          .eq('session_id', activeSession.id)
          .eq('client_id', selectedClient.id)
          .single();

        const program = participant?.programs
          ? (Array.isArray(participant.programs) ? participant.programs[0] : participant.programs)
          : null;
        if (program?.exercises) {
          const exercises = program.exercises;
          const currentIndex = sessionState.current_exercise_index || 0;
          const programExercise = exercises[currentIndex];

          if (programExercise) {
            // Get full exercise details
            const { data: exercise } = await supabase
              .from('exercises')
              .select('*')
              .eq('id', programExercise.exercise_id)
              .single();

            setCurrentExercise({
              ...exercise,
              sets: programExercise.sets,
              reps: programExercise.reps,
              rest_seconds: programExercise.rest_seconds
            });
          }
        }
      } catch (error) {
        console.error('Error loading exercise details:', error);
      }
    }

    loadExerciseDetails();
  }, [sessionState, activeSession, selectedClient]);

  async function loadActiveSession() {
    try {
      // Get active sessions
      const { data: sessions } = await supabase
        .from('sessions')
        .select(`
          *,
          session_participants (
            id,
            client_id,
            clients (*)
          )
        `)
        .eq('status', 'active')
        .order('session_date', { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        setActiveSession(session);
        
        const clients = session.session_participants.map((p: any) => p.clients);
        setAvailableClients(clients);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkIn(client: any) {
    try {
      setSelectedClient(client);

      // Get session state for this client
      const { data: state } = await supabase
        .from('session_state')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('client_id', client.id)
        .single();

      setSessionState(state);

      // Mark as checked in
      await supabase
        .from('session_participants')
        .update({ checked_in: true })
        .eq('session_id', activeSession.id)
        .eq('client_id', client.id);

    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in');
    }
  }

  async function submitRPE(rpe: number) {
    if (!sessionState) return;

    try {
      // Calculate rest extension for high RPE
      let restExtension = 0;
      if (rpe >= 9) {
        restExtension = 30; // Add 30 seconds
      } else if (rpe === 8) {
        restExtension = 15; // Add 15 seconds
      }

      const newRestTime = (sessionState.rest_remaining_seconds || 90) + restExtension;

      await supabase
        .from('session_state')
        .update({ 
          rpe,
          rest_remaining_seconds: newRestTime
        })
        .eq('id', sessionState.id);

      setSessionState({ ...sessionState, rpe, rest_remaining_seconds: newRestTime });

      // Alert if rest extended
      if (restExtension > 0) {
        alert(`High RPE detected! Rest extended by ${restExtension} seconds.`);
      }

      // Create alert for coach if RPE >= 9
      if (rpe >= 9) {
        await supabase
          .from('alerts')
          .insert({
            session_id: activeSession.id,
            client_id: selectedClient.id,
            alert_type: 'high_rpe',
            message: `${selectedClient.name} reported RPE ${rpe} - rest auto-extended`,
            requires_action: false
          });
      }
    } catch (error) {
      console.error('Error submitting RPE:', error);
    }
  }

  async function flagPain() {
    if (!sessionState) return;

    const painDescription = prompt('Describe the pain (e.g., "Left knee - sharp pain during squat"):');
    if (!painDescription) return;

    try {
      // Create alert for coach
      await supabase
        .from('alerts')
        .insert({
          session_id: activeSession.id,
          client_id: selectedClient.id,
          alert_type: 'pain',
          message: `${selectedClient.name}: ${painDescription}`,
          requires_action: true
        });

      alert('Coach has been notified. They will check in with you shortly.');
    } catch (error) {
      console.error('Error flagging pain:', error);
      alert('Failed to send alert');
    }
  }

  async function completeSet() {
    if (!sessionState) {
      alert('No active session state found');
      return;
    }

    try {
      const response = await fetch('/api/advance-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionStateId: sessionState.id,
          sessionId: activeSession.id,
          clientId: selectedClient.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to advance exercise');
      }

      const data = await response.json();

      if (data.complete) {
        alert('🎉 Workout complete! Great work today!');
      } else if (data.substituted) {
        alert(`⚠️ Equipment Conflict!\n\n${data.from} is not available.\n\nSwitching to: ${data.to}\n\nReason: ${data.reason}\n\nCoach has been notified.`);

        // Reload exercise details after substitution
        if (data.exerciseId) {
          const { data: newExercise } = await supabase
            .from('exercises')
            .select('*')
            .eq('id', data.exerciseId)
            .single();
          
          if (newExercise) {
            setCurrentExercise({
              ...newExercise,
              sets: data.sets || 2,
              reps: data.reps || 10,
              rest_seconds: data.restSeconds || 60
            });
          }
        }
      } else if (data.waiting) {
        alert(`⏸️ Equipment Occupied\n\n${data.exercise} cannot start.\n\nEquipment in use: ${data.conflicts?.join(', ')}\n\nNo alternatives available.\nPlease wait for coach instruction.`);
      } else if (data.advanced) {
        alert(`✅ Next Exercise: ${data.exercise}\n\n${data.sets} sets × ${data.reps} reps`);
      } else if (data.nextSet) {
        alert(`✅ Set Complete!\n\nRest for ${data.restSeconds} seconds.\n\nNext: Set ${data.nextSet} of ${data.totalSets}`);
      }

    } catch (error: any) {
      console.error('Error completing set:', error);
      alert('Error: ' + error.message);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // No active session
  if (!activeSession) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⏸️</div>
          <h1 className="text-2xl font-bold text-white mb-2">No Active Session</h1>
          <p className="text-gray-400">
            There are no active training sessions right now. Check back when your coach starts the session.
          </p>
        </div>
      </div>
    );
  }

  // Check-in screen (client not selected)
  if (!selectedClient) {
    return (
      <div className="min-h-screen bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Check In</h1>
            <p className="text-gray-400">Select your name to join the session</p>
          </div>

          <div className="grid gap-4">
            {availableClients.map((client) => (
              <button
                key={client.id}
                onClick={() => checkIn(client)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-all"
              >
                <div className="text-xl font-semibold text-white mb-1">{client.name}</div>
                {client.current_injuries && (
                  <div className="text-red-400 text-sm">⚠️ {client.current_injuries}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main client interface (checked in)
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-400">Welcome back</div>
            <div className="text-xl font-bold text-white">{selectedClient.name}</div>
          </div>
          <button
            onClick={() => {
              setSelectedClient(null);
              setSessionState(null);
            }}
            className="text-gray-400 hover:text-white text-sm"
          >
            Check Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Warning banner if injury */}
        {selectedClient.current_injuries && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <div className="text-red-400 font-semibold mb-1">Current Injury Alert</div>
                <div className="text-red-300 text-sm">{selectedClient.current_injuries}</div>
              </div>
            </div>
          </div>
        )}

        {/* Current status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="text-sm text-gray-400 mb-2">Current Status</div>
            <div className={`
              inline-block px-6 py-2 rounded-full text-lg font-bold
              ${sessionState?.status === 'active' ? 'bg-green-600' : ''}
              ${sessionState?.status === 'resting' ? 'bg-yellow-600' : ''}
              ${sessionState?.status === 'ready' ? 'bg-gray-600' : ''}
            `}>
              {sessionState?.status?.toUpperCase() || 'READY'}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Exercise</div>
              <div className="text-xl font-bold text-white">
                {currentExercise?.name || `Exercise #${(sessionState?.current_exercise_index || 0) + 1}`}
              </div>
              {currentExercise && (
                <div className="text-gray-400 text-sm mt-1">
                  {currentExercise.sets} sets × {currentExercise.reps} reps • {currentExercise.rest_seconds}s rest
                </div>
              )}
              <div className="text-gray-300 text-sm mt-2">
                Set {sessionState?.current_set || 1}
              </div>
            </div>

            {sessionState?.rest_remaining_seconds && sessionState.rest_remaining_seconds > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 text-center">
                <div className="text-sm text-yellow-400 mb-2">Rest Period</div>
                <div className="text-4xl font-bold text-yellow-300">
                  {Math.floor(sessionState.rest_remaining_seconds / 60)}:{String(sessionState.rest_remaining_seconds % 60).padStart(2, '0')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RPE Input */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center mb-4">
            <div className="text-lg font-semibold text-white mb-1">How Hard Was That Set?</div>
            <div className="text-sm text-gray-400">Rate of Perceived Exertion (RPE)</div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {[6, 7, 8, 9, 10].map((rpe) => (
              <button
                key={rpe}
                onClick={() => submitRPE(rpe)}
                className={`
                  aspect-square rounded-lg font-bold text-2xl transition-all
                  ${sessionState?.rpe === rpe 
                    ? 'bg-blue-600 text-white scale-110' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                `}
              >
                {rpe}
              </button>
            ))}
          </div>

          {sessionState?.rpe && (
            <div className="mt-4 text-center">
              <div className="text-sm text-green-400">✓ RPE {sessionState.rpe} recorded</div>
            </div>
          )}
        </div>

        {/* Pain Flag Button */}
        <button
          onClick={flagPain}
          className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-6 font-bold text-lg transition-all"
        >
          <div className="text-3xl mb-2">😣</div>
          TAP IF YOU FEEL PAIN
        </button>

        {/* Complete Set Button */}
        <button
          onClick={completeSet}
          className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg p-6 font-bold text-lg transition-all"
        >
          <div className="text-3xl mb-2">✓</div>
          COMPLETE SET
        </button>

        {/* Current equipment in use */}
        {sessionState?.equipment_in_use && sessionState.equipment_in_use.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2">Equipment You're Using</div>
            <div className="flex flex-wrap gap-2">
              {sessionState.equipment_in_use.map((equip: string, i: number) => (
                <span key={i} className="bg-blue-900 text-blue-300 px-3 py-1 rounded-full text-sm">
                  {equip}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Info footer */}
        <div className="text-center text-sm text-gray-500 pt-4">
          Session in progress • Coach is monitoring your progress
        </div>
      </div>
    </div>
  );
}