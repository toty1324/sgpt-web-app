import { NextResponse } from 'next/server';
import { supabase, checkEquipmentAvailable, findAlternativeExercise } from '@/lib/supabase';
import { saveDecision } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_INSTRUCTIONS = `You are the SGPT Logic Assistant. [Your full GPT instructions here]`;

export async function POST(request: Request) {
  try {
    const { sessionStateId, sessionId, clientId } = await request.json();

    // Get current session state
    const { data: state } = await supabase
      .from('session_state')
      .select(`
        *,
        sessions!inner (
          session_participants!inner (
            programs (exercises)
          )
        )
      `)
      .eq('id', sessionStateId)
      .single();

    if (!state) throw new Error('Session state not found');

    const program = state.sessions.session_participants[0]?.programs;
    if (!program?.exercises) throw new Error('No program found');

    const exercises = program.exercises;
    const currentIndex = state.current_exercise_index;
    const currentSet = state.current_set;
    const currentExercise = exercises[currentIndex];

    // Check if current exercise is complete
    if (currentSet >= currentExercise.sets) {
      // Move to next exercise
      const nextIndex = currentIndex + 1;
      
      if (nextIndex >= exercises.length) {
        // Program complete
        await supabase
          .from('session_state')
          .update({ status: 'complete', equipment_in_use: [] })
          .eq('id', sessionStateId);

        return NextResponse.json({ message: 'Program complete!' });
      }

      // Get next exercise
      const nextExercise = exercises[nextIndex];
      const { data: exerciseData } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', nextExercise.exercise_id)
        .single();

      if (!exerciseData) throw new Error('Exercise not found');

      // Check equipment availability
      const available = await checkEquipmentAvailable(sessionId, exerciseData.required_equipment);

      if (!available) {
        // EQUIPMENT CONFLICT DETECTED
        const alternative = await findAlternativeExercise(nextExercise.exercise_id, sessionId);

        if (alternative) {
          // Auto-substitute
          await supabase
            .from('session_state')
            .update({
              current_exercise_index: nextIndex,
              current_set: 1,
              equipment_in_use: alternative.required_equipment,
              status: 'active'
            })
            .eq('id', sessionStateId);

          // Log decision
          await saveDecision({
            sessionId,
            clientId,
            triggerType: 'equipment_conflict',
            scenario: `${exerciseData.name} equipment occupied`,
            aiDecision: `Auto-substituted: ${alternative.name}`,
            requiresApproval: false,
            approved: true,
            clientName: 'Auto-system'
          });

          // Create alert
          await supabase
            .from('alerts')
            .insert({
              session_id: sessionId,
              client_id: clientId,
              alert_type: 'equipment_conflict',
              message: `Auto-substituted ${exerciseData.name} → ${alternative.name} (equipment conflict)`,
              requires_action: false
            });

          return NextResponse.json({ 
            substituted: true,
            from: exerciseData.name,
            to: alternative.name
          });
        } else {
          // No alternative - create alert for coach
          await supabase
            .from('alerts')
            .insert({
              session_id: sessionId,
              client_id: clientId,
              alert_type: 'equipment_conflict',
              message: `${exerciseData.name} equipment occupied - no alternatives available`,
              requires_action: true
            });

          return NextResponse.json({ 
            waiting: true,
            exercise: exerciseData.name
          });
        }
      }

      // Equipment available - proceed normally
      await supabase
        .from('session_state')
        .update({
          current_exercise_index: nextIndex,
          current_set: 1,
          equipment_in_use: exerciseData.required_equipment,
          status: 'active'
        })
        .eq('id', sessionStateId);

      return NextResponse.json({ 
        advanced: true,
        exercise: exerciseData.name
      });

    } else {
      // Move to next set
      await supabase
        .from('session_state')
        .update({
          current_set: currentSet + 1,
          status: 'resting',
          rest_remaining_seconds: currentExercise.rest_seconds
        })
        .eq('id', sessionStateId);

      return NextResponse.json({ 
        nextSet: currentSet + 1,
        restSeconds: currentExercise.rest_seconds
      });
    }

  } catch (error: any) {
    console.error('Error advancing exercise:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}