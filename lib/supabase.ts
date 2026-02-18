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
export async function checkEquipmentAvailable(
  sessionId: string, 
  requiredEquipment: string[]
): Promise<{available: boolean, conflicts: string[]}> {
  try {
    if (!requiredEquipment || requiredEquipment.length === 0) {
      return { available: true, conflicts: [] };
    }

    // Get all active session states
    const { data: states } = await supabase
      .from('session_state')
      .select('equipment_in_use, status')
      .eq('session_id', sessionId)
      .in('status', ['active', 'resting']);

    // Get equipment quantities from database
    const { data: equipment } = await supabase
      .from('equipment')
      .select('name, quantity')
      .in('name', requiredEquipment);

    // Count current usage
    const inUse: Record<string, number> = {};
    states?.forEach(state => {
      if (state.equipment_in_use && Array.isArray(state.equipment_in_use)) {
        state.equipment_in_use.forEach((equip: string) => {
          inUse[equip] = (inUse[equip] || 0) + 1;
        });
      }
    });

    // Check each required piece of equipment
    const conflicts: string[] = [];
    
    for (const reqEquip of requiredEquipment) {
      const equipItem = equipment?.find(e => e.name === reqEquip);
      
      if (!equipItem) {
        console.warn(`Equipment not found in database: ${reqEquip}`);
        continue;
      }

      const currentlyInUse = inUse[equipItem.name] || 0;
      
      console.log(`Equipment check: ${equipItem.name} - ${currentlyInUse}/${equipItem.quantity} in use`);
      
      if (currentlyInUse >= equipItem.quantity) {
        conflicts.push(equipItem.name);
      }
    }

    return {
      available: conflicts.length === 0,
      conflicts: conflicts
    };

  } catch (error) {
    console.error('Error checking equipment availability:', error);
    return { available: false, conflicts: [] };
  }
}
  
  // Find alternative exercise when equipment conflict
  export async function findAlternativeExercise(
    exerciseId: string, 
    sessionId: string
  ) {
    try {
      // Get the conflicted exercise details
      const { data: exercise } = await supabase
        .from('exercises')
        .select('name, movement_pattern, required_equipment')
        .eq('id', exerciseId)
        .single();
  
      if (!exercise) {
        console.log('Exercise not found');
        return null;
      }
  
      console.log(`Finding alternative for: ${exercise.name} (${exercise.movement_pattern})`);
  
      // Find all exercises with same movement pattern
      const { data: alternatives } = await supabase
        .from('exercises')
        .select('*')
        .eq('movement_pattern', exercise.movement_pattern)
        .neq('id', exerciseId);
  
      if (!alternatives || alternatives.length === 0) {
        console.log('No alternatives with same movement pattern');
        return null;
      }
  
      console.log(`Found ${alternatives.length} potential alternatives`);
  
      // Check each alternative for equipment availability
      for (const alt of alternatives) {
        // Bodyweight exercises always available
        if (!alt.required_equipment || alt.required_equipment.length === 0) {
          console.log(`Found bodyweight alternative: ${alt.name}`);
          return alt;
        }
  
        const equipCheck = await checkEquipmentAvailable(sessionId, alt.required_equipment);
        
        console.log(`Checking alternative ${alt.name}:`, equipCheck);
        
        if (equipCheck.available) {
          console.log(`Found available alternative: ${alt.name}`);
          return alt;
        }
      }
  
      console.log('No available alternatives found');
      return null;
  
    } catch (error) {
      console.error('Error finding alternative exercise:', error);
      return null;
    }
  }