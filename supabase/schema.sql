-- PZZA PARTY - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- ============================================================================
-- PLAYERS TABLE
-- Mirrors on-chain registration with UX enhancements
-- ============================================================================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  registered_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  last_ip TEXT, -- For Sybil detection
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ROOMS TABLE
-- Real-time index of active game rooms
-- ============================================================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT UNIQUE NOT NULL, -- Matches on-chain room name
  creator_address TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  total_slices INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  current_king TEXT, -- Address of current room king
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ACTIVE SESSIONS TABLE
-- Prevents multi-browser abuse via IP tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  room_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(wallet_address, room_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_players_wallet ON players(wallet_address);
CREATE INDEX IF NOT EXISTS idx_rooms_room_id ON rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_sessions_room ON active_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ip ON active_sessions(ip_address);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allow public read/write for now (can be tightened later)
-- ============================================================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read access" ON players FOR SELECT USING (true);
CREATE POLICY "Public read access" ON rooms FOR SELECT USING (true);
CREATE POLICY "Public read access" ON active_sessions FOR SELECT USING (true);

-- Public insert access (needed for registration and room creation)
CREATE POLICY "Public insert access" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON active_sessions FOR INSERT WITH CHECK (true);

-- Public update access (for last_seen, room stats, etc.)
CREATE POLICY "Public update access" ON players FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON rooms FOR UPDATE USING (true);

-- Public delete access (for session cleanup)
CREATE POLICY "Public delete access" ON active_sessions FOR DELETE USING (true);

-- ============================================================================
-- SLICES TABLE
-- Real-time grid syncing for the UI
-- ============================================================================
CREATE TABLE IF NOT EXISTS slices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  slice_id INTEGER NOT NULL,
  owner_address TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, slice_id)
);

CREATE INDEX IF NOT EXISTS idx_slices_room ON slices(room_id);
ALTER TABLE slices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON slices FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON slices FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON slices FOR UPDATE USING (true);
