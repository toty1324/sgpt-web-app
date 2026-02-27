import { NextResponse } from 'next/server';
import { supabase, checkEquipmentAvailable, findAlternativeExercise, saveDecision } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { sessionStateId, sessionId, clientId } = await request.json();

    if (!sessionStateId || !sessionId || !clientId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current session state
    const { data: state, error: stateError } = await supabase
      .from('session_state')
      .select('*')
      .eq('id', sessionStateId)
      .single();

    if (stateError || !state) {
      return NextResponse.json({ error: 'Session state not found' }, { status: 404 });
    }

    // Get client's program for this session
    const { data: participant } = await supabase
      .from('session_participants')
      .select(`
        programs (
          id,
          exercises
        )
      `)
      .eq('session_id', sessionId)
      .eq('client_id', clientId)
      .single();

      if (!participant?.programs) {
      return NextResponse.json({ error: 'No program found for client' }, { status: 404 });
    }

    const program = Array.isArray(participant.programs) ? participant.programs[0] : participant.programs;
const programExercises = program?.exercises;
    const currentIndex = state.current_exercise_index || 0;
    const currentSet = state.current_set || 1;
    const currentExercise = programExercises[currentIndex];

    if (!currentExercise) {
      return NextResponse.json({ error: 'Current exercise not found' }, { status: 404 });
    }

    // Check if this completes all sets of current exercise
    if (currentSet >= currentExercise.sets) {
      // ── ADVANCE TO NEXT EXERCISE ──
      const nextIndex = currentIndex + 1;

      // Check if program is complete
      if (nextIndex >= programExercises.length) {
        await supabase
          .from('session_state')
          .update({ 
            status: 'complete', 
            equipment_in_use: [],
            current_set: currentSet
          })
          .eq('id', sessionStateId);

        return NextResponse.json({ complete: true });
      }

      // Get next exercise details
      const nextProgramExercise = programExercises[nextIndex];

      const { data: nextExerciseData } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', nextProgramExercise.exercise_id)
        .single();

      if (!nextExerciseData) {
        return NextResponse.json({ error: 'Next exercise not found' }, { status: 404 });
      }

      const requiredEquipment = nextExerciseData.required_equipment || [];

      // ── EQUIPMENT CONFLICT CHECK ──
      if (requiredEquipment.length > 0) {
        const equipCheck = await checkEquipmentAvailable(sessionId, requiredEquipment);

        console.log('Equipment availability check:', equipCheck);

        if (!equipCheck.available) {
          // CONFLICT DETECTED
          console.log(`Conflict detected for ${nextExerciseData.name}:`, equipCheck.conflicts);

          // Try to find an alternative exercise
          const alternative = await findAlternativeExercise(
            nextProgramExercise.exercise_id, 
            sessionId
          );

          if (alternative) {
            // AUTO-SUBSTITUTE
            console.log('Auto-substituting to:', alternative.name);

            await supabase
              .from('session_state')
              .update({
                current_exercise_index: nextIndex,
                current_set: 1,
                equipment_in_use: alternative.required_equipment || [],
                status: 'active',
                rpe: null
              })
              .eq('id', sessionStateId);

            await saveDecision({
              sessionId,
              clientId,
              clientName: 'Auto-system',
              triggerType: 'equipment_conflict',
              scenario: `${nextExerciseData.name} unavailable - ${equipCheck.conflicts.join(', ')} occupied`,
              aiDecision: `Auto-substituted to ${alternative.name} (same movement pattern: ${alternative.movement_pattern})`,
              requiresApproval: false,
              approved: true
            });

            await supabase
              .from('alerts')
              .insert({
                session_id: sessionId,
                client_id: clientId,
                alert_type: 'equipment_conflict',
                message: `Equipment conflict resolved: ${nextExerciseData.name} → ${alternative.name} (${equipCheck.conflicts.join(', ')} occupied)`,
                requires_action: false
              });

            return NextResponse.json({
              substituted: true,
              from: nextExerciseData.name,
              to: alternative.name,
              exerciseId: alternative.id,
              reason: `${equipCheck.conflicts.join(', ')} occupied`
            });

          } else {
            // NO ALTERNATIVE - CLIENT WAITS
            console.log('No alternatives available - creating alert');

            await supabase
              .from('session_state')
              .update({
                status: 'waiting',
                equipment_in_use: [],
                rpe: null
              })
              .eq('id', sessionStateId);

            await supabase
              .from('alerts')
              .insert({
                session_id: sessionId,
                client_id: clientId,
                alert_type: 'equipment_conflict',
                message: `${nextExerciseData.name} cannot proceed - ${equipCheck.conflicts.join(', ')} all occupied. No alternatives found. Client waiting.`,
                requires_action: true
              });

            return NextResponse.json({
              waiting: true,
              exercise: nextExerciseData.name,
              conflicts: equipCheck.conflicts
            });
          }
        }
      }

      // ── EQUIPMENT AVAILABLE - ADVANCE NORMALLY ──
      await supabase
        .from('session_state')
        .update({
          current_exercise_index: nextIndex,
          current_set: 1,
          equipment_in_use: requiredEquipment,
          status: 'active',
          rpe: null
        })
        .eq('id', sessionStateId);

      return NextResponse.json({
        advanced: true,
        exercise: nextExerciseData.name,
        sets: nextProgramExercise.sets,
        reps: nextProgramExercise.reps
      });

    } else {
      // ── ADVANCE TO NEXT SET ──
      const restSeconds = currentExercise.rest_seconds || 90;

      await supabase
        .from('session_state')
        .update({
          current_set: currentSet + 1,
          status: 'resting',
          equipment_in_use: [], // Release equipment during rest
          rest_remaining_seconds: restSeconds,
          rpe: null
        })
        .eq('id', sessionStateId);

      return NextResponse.json({
        nextSet: currentSet + 1,
        totalSets: currentExercise.sets,
        restSeconds
      });
    }

  } catch (error: any) {
    console.error('Advance exercise error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}