import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database helper functions

// Get all equipment
export async function getEquipment() {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

// Get all clients
export async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

// Get all exercises
export async function getExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

// Get active sessions
export async function getActiveSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      session_participants (
        id,
        client_id,
        program_id,
        checked_in,
        clients (
          id,
          name,
          injury_history,
          current_injuries
        )
      )
    `)
    .eq('status', 'active');
  
  if (error) throw error;
  return data;
}

// Get equipment availability (which equipment is currently in use)
export async function getEquipmentAvailability() {
  const { data: equipment } = await supabase
    .from('equipment')
    .select('name, quantity');

  const { data: sessionStates } = await supabase
    .from('session_state')
    .select('equipment_in_use')
    .eq('status', 'active');

  // Count how many of each equipment is in use
  const inUse: Record<string, number> = {};
  
  sessionStates?.forEach(state => {
    state.equipment_in_use?.forEach((equip: string) => {
      inUse[equip] = (inUse[equip] || 0) + 1;
    });
  });

  // Calculate available quantities
  const availability = equipment?.map(item => ({
    name: item.name,
    total: item.quantity,
    inUse: inUse[item.name] || 0,
    available: item.quantity - (inUse[item.name] || 0),
    isAvailable: item.quantity > (inUse[item.name] || 0)
  }));

  return availability || [];
}

// Save decision to database
export async function saveDecision(data: {
  sessionId?: string;
  clientId?: string;
  clientName: string;
  triggerType?: string;
  scenario: string;
  equipmentStatus?: string;
  timeRemaining?: number;
  aiDecision: string;
  requiresApproval?: boolean;
  approved?: boolean;
}) {
  const { data: result, error } = await supabase
    .from('decisions')
    .insert({
      session_id: data.sessionId || null,
      client_id: data.clientId || null,
      trigger_type: data.triggerType || 'manual',
      scenario: data.scenario,
      ai_decision: data.aiDecision,
      requires_approval: data.requiresApproval ?? false,
      approved: data.approved ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

// Get recent decisions
export async function getRecentDecisions(limit = 20) {
  const { data, error } = await supabase
    .from('decisions')
    .select(`
      *,
      clients (name),
      sessions (session_date)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

// Auto-assign equipment to client's session state
export async function assignEquipment(sessionStateId: string, exerciseId: string) {
    try {
      // Get exercise requirements
      const { data: exercise } = await supabase
        .from('exercises')
        .select('required_equipment')
        .eq('id', exerciseId)
        .single();
  
      if (!exercise || !exercise.required_equipment) return;
  
      // Update session state with equipment
      await supabase
        .from('session_state')
        .update({ 
          equipment_in_use: exercise.required_equipment,
          status: 'active'
        })
        .eq('id', sessionStateId);
  
    } catch (error) {
      console.error('Error assigning equipment:', error);
    }
  }
  
  // Release equipment when client finishes
  export async function releaseEquipment(sessionStateId: string) {
    try {
      await supabase
        .from('session_state')
        .update({ 
          equipment_in_use: [],
          status: 'resting'
        })
        .eq('id', sessionStateId);
    } catch (error) {
      console.error('Error releasing equipment:', error);
    }
  }
  
  // Check if equipment is available
  export async function checkEquipmentAvailable(sessionId: string, requiredEquipment: string[]): Promise<boolean> {
    try {
      // Get all active session states
      const { data: states } = await supabase
        .from('session_state')
        .select('equipment_in_use')
        .eq('session_id', sessionId)
        .eq('status', 'active');
  
      // Get equipment quantities
      const { data: equipment } = await supabase
        .from('equipment')
        .select('name, quantity')
        .in('name', requiredEquipment);
  
      // Count usage
      const inUse: Record<string, number> = {};
      states?.forEach(state => {
        state.equipment_in_use?.forEach((equip: string) => {
          inUse[equip] = (inUse[equip] || 0) + 1;
        });
      });
  
      // Check availability
      for (const item of equipment || []) {
        const used = inUse[item.name] || 0;
        if (used >= item.quantity) {
          return false; // Not available
        }
      }
  
      return true; // All equipment available
    } catch (error) {
      console.error('Error checking equipment:', error);
      return false;
    }
  }
  
  // Find alternative exercise when equipment conflict
  export async function findAlternativeExercise(exerciseId: string, sessionId: string) {
    try {
      const { data: exercise } = await supabase
        .from('exercises')
        .select('*, substitutions')
        .eq('id', exerciseId)
        .single();
  
      if (!exercise?.substitutions || exercise.substitutions.length === 0) {
        return null;
      }
  
      // Check each substitution for availability
      for (const subId of exercise.substitutions) {
        const { data: sub } = await supabase
          .from('exercises')
          .select('*')
          .eq('id', subId)
          .single();
  
        if (sub && sub.required_equipment) {
          const available = await checkEquipmentAvailable(sessionId, sub.required_equipment);
          if (available) {
            return sub; // Found available alternative
          }
        }
      }
  
      return null; // No alternatives available
    } catch (error) {
      console.error('Error finding alternative:', error);
      return null;
    }
  }