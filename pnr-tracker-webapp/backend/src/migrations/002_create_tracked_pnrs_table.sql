-- UP
CREATE TABLE tracked_pnrs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pnr VARCHAR(10) NOT NULL,
  current_status JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_pnr UNIQUE(user_id, pnr)
);

-- Create indexes for better performance
CREATE INDEX idx_tracked_pnrs_user_id ON tracked_pnrs(user_id);
CREATE INDEX idx_tracked_pnrs_pnr ON tracked_pnrs(pnr);
CREATE INDEX idx_tracked_pnrs_is_active ON tracked_pnrs(is_active);
CREATE INDEX idx_tracked_pnrs_created_at ON tracked_pnrs(created_at);
CREATE INDEX idx_tracked_pnrs_updated_at ON tracked_pnrs(updated_at);

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_tracked_pnrs_updated_at 
    BEFORE UPDATE ON tracked_pnrs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure PNR is exactly 10 digits
ALTER TABLE tracked_pnrs ADD CONSTRAINT check_pnr_format 
    CHECK (pnr ~ '^[0-9]{10}$');

-- DOWN
DROP TRIGGER IF EXISTS update_tracked_pnrs_updated_at ON tracked_pnrs;
DROP INDEX IF EXISTS idx_tracked_pnrs_updated_at;
DROP INDEX IF EXISTS idx_tracked_pnrs_created_at;
DROP INDEX IF EXISTS idx_tracked_pnrs_is_active;
DROP INDEX IF EXISTS idx_tracked_pnrs_pnr;
DROP INDEX IF EXISTS idx_tracked_pnrs_user_id;
DROP TABLE IF EXISTS tracked_pnrs;