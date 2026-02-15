import { sql } from '@vercel/postgres';

// Initialize database tables (run once)
export async function initDatabase() {
  // Gym Setup
  await sql`
    CREATE TABLE IF NOT EXISTS gym_equipment (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      quantity INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Exercise Library
  await sql`
    CREATE TABLE IF NOT EXISTS exercises (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      equipment VARCHAR(200),
      movement_pattern VARCHAR(50),
      substitutions TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Client Profiles
  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      injury_flags TEXT,
      assigned_program VARCHAR(200),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Programs
  await sql`
    CREATE TABLE IF NOT EXISTS programs (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      client_id INTEGER REFERENCES clients(id),
      exercises TEXT, -- JSON array of exercises
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Sessions
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      session_time TIMESTAMP NOT NULL,
      coach VARCHAR(100),
      clients TEXT, -- JSON array of client IDs
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Decision Log (AUTO-SAVES)
  await sql`
    CREATE TABLE IF NOT EXISTS decisions (
      id SERIAL PRIMARY KEY,
      session_id INTEGER,
      client_name VARCHAR(100),
      scenario TEXT NOT NULL,
      equipment_status VARCHAR(200),
      time_remaining INTEGER,
      ai_decision TEXT NOT NULL,
      accepted BOOLEAN DEFAULT TRUE,
      override_reason TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// Save decision automatically
export async function saveDecision(data: {
  sessionId?: number;
  clientName: string;
  scenario: string;
  equipmentStatus?: string;
  timeRemaining?: number;
  aiDecision: string;
  accepted?: boolean;
  overrideReason?: string;
}) {
  const result = await sql`
    INSERT INTO decisions (
      session_id, client_name, scenario, equipment_status, 
      time_remaining, ai_decision, accepted, override_reason
    )
    VALUES (
      ${data.sessionId || null}, 
      ${data.clientName}, 
      ${data.scenario}, 
      ${data.equipmentStatus || null},
      ${data.timeRemaining || null}, 
      ${data.aiDecision}, 
      ${data.accepted ?? true},
      ${data.overrideReason || null}
    )
    RETURNING *
  `;
  return result.rows[0];
}

// Get recent decisions
export async function getRecentDecisions(limit = 10) {
  const result = await sql`
    SELECT * FROM decisions 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `;
  return result.rows;
}

// Get all clients
export async function getClients() {
  const result = await sql`SELECT * FROM clients ORDER BY name`;
  return result.rows;
}

// Add more helper functions as needed...