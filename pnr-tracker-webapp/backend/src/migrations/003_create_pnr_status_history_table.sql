-- UP
CREATE TABLE pnr_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracked_pnr_id UUID NOT NULL REFERENCES tracked_pnrs(id) ON DELETE CASCADE,
  status_data JSONB NOT NULL,
  checked_at TIMESTAMP DEFAULT NOW(),
  status_changed BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX idx_pnr_status_history_tracked_pnr_id ON pnr_status_history(tracked_pnr_id);
CREATE INDEX idx_pnr_status_history_checked_at ON pnr_status_history(checked_at);
CREATE INDEX idx_pnr_status_history_status_changed ON pnr_status_history(status_changed);

-- Create composite index for common queries
CREATE INDEX idx_pnr_status_history_tracked_pnr_checked_at 
    ON pnr_status_history(tracked_pnr_id, checked_at DESC);

-- Create index for status changes only
CREATE INDEX idx_pnr_status_history_changes 
    ON pnr_status_history(tracked_pnr_id, checked_at DESC) 
    WHERE status_changed = true;

-- Create partial index for cleanup operations (non-changed entries older than certain date)
CREATE INDEX idx_pnr_status_history_cleanup 
    ON pnr_status_history(checked_at) 
    WHERE status_changed = false;

-- DOWN
DROP INDEX IF EXISTS idx_pnr_status_history_cleanup;
DROP INDEX IF EXISTS idx_pnr_status_history_changes;
DROP INDEX IF EXISTS idx_pnr_status_history_tracked_pnr_checked_at;
DROP INDEX IF EXISTS idx_pnr_status_history_status_changed;
DROP INDEX IF EXISTS idx_pnr_status_history_checked_at;
DROP INDEX IF EXISTS idx_pnr_status_history_tracked_pnr_id;
DROP TABLE IF EXISTS pnr_status_history;