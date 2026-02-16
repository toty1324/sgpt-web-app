'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProgramsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [programName, setProgramName] = useState('');
  const [programExercises, setProgramExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [clientsData, exercisesData] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('exercises').select('*').order('name')
      ]);

      setClients(clientsData.data || []);
      setExercises(exercisesData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function addExercise(exercise: any) {
    setProgramExercises([
      ...programExercises,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        required_equipment: exercise.required_equipment,
        sets: 3,
        reps: 10,
        rest_seconds: 90,
        order: programExercises.length
      }
    ]);
  }

  function removeExercise(index: number) {
    setProgramExercises(programExercises.filter((_, i) => i !== index));
  }

  function updateExercise(index: number, field: string, value: any) {
    const updated = [...programExercises];
    updated[index][field] = value;
    setProgramExercises(updated);
  }

  async function saveProgram() {
    if (!selectedClient || !programName || programExercises.length === 0) {
      alert('Please select client, enter program name, and add exercises');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('programs')
        .insert({
          client_id: selectedClient.id,
          name: programName,
          exercises: programExercises
        });

      if (error) throw error;

      alert('Program saved successfully!');
      setProgramName('');
      setProgramExercises([]);
      setSelectedClient(null);
    } catch (error: any) {
      console.error('Error saving program:', error);
      alert('Failed to save program: ' + error.message);
    } finally {
      setSaving(false);
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Program Builder</h1>
          <p className="text-gray-400">Create individualized training programs for clients</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Program Creation */}
          <div className="space-y-4">
            {/* Client Selection */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">1. Select Client</h2>
              <select
                value={selectedClient?.id || ''}
                onChange={(e) => {
                  const client = clients.find(c => c.id === e.target.value);
                  setSelectedClient(client);
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white"
              >
                <option value="">Choose a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Program Name */}
            {selectedClient && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">2. Program Name</h2>
                <input
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="e.g., Hypertrophy Block 1"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white"
                />
              </div>
            )}

            {/* Exercise Library */}
            {selectedClient && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">3. Add Exercises</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {exercises.map(exercise => (
                    <div key={exercise.id} className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <div>
                        <div className="text-white font-medium">{exercise.name}</div>
                        <div className="text-xs text-gray-400">
                          {exercise.required_equipment?.join(', ')}
                        </div>
                      </div>
                      <button
                        onClick={() => addExercise(exercise)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Program Preview */}
          <div>
            {selectedClient && (
              <div className="bg-gray-800 rounded-lg p-6 sticky top-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Program Preview</h2>
                    <p className="text-sm text-gray-400">{selectedClient.name}</p>
                  </div>
                  {programExercises.length > 0 && (
                    <button
                      onClick={saveProgram}
                      disabled={saving || !programName}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-semibold"
                    >
                      {saving ? 'Saving...' : 'Save Program'}
                    </button>
                  )}
                </div>

                {programExercises.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No exercises added yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {programExercises.map((ex, index) => (
                      <div key={index} className="bg-gray-700 rounded p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-white font-semibold">{index + 1}. {ex.exercise_name}</div>
                            <div className="text-xs text-gray-400">{ex.required_equipment?.join(', ')}</div>
                          </div>
                          <button
                            onClick={() => removeExercise(index)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Sets</label>
                            <input
                              type="number"
                              value={ex.sets}
                              onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value))}
                              className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Reps</label>
                            <input
                              type="number"
                              value={ex.reps}
                              onChange={(e) => updateExercise(index, 'reps', parseInt(e.target.value))}
                              className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Rest (s)</label>
                            <input
                              type="number"
                              value={ex.rest_seconds}
                              onChange={(e) => updateExercise(index, 'rest_seconds', parseInt(e.target.value))}
                              className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}