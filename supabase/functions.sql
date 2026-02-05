-- Helper function to atomically increment room slice count
-- This prevents race conditions when multiple slices are bought simultaneously
CREATE OR REPLACE FUNCTION increment_room_slices(p_room_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE rooms
  SET total_slices = total_slices + 1,
      updated_at = NOW()
  WHERE room_id = p_room_id;
END;
$$ LANGUAGE plpgsql;
