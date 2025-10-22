-- UP
CREATE TYPE notification_type AS ENUM (
  'confirmation', 
  'waitlist_movement', 
  'cancellation', 
  'chart_prepared', 
  'system', 
  'error'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Create composite indexes for common queries
CREATE INDEX idx_notifications_user_unread 
    ON notifications(user_id, created_at DESC) 
    WHERE is_read = false;

CREATE INDEX idx_notifications_user_type 
    ON notifications(user_id, type, created_at DESC);

-- Create partial index for cleanup operations (old read notifications)
CREATE INDEX idx_notifications_cleanup 
    ON notifications(created_at) 
    WHERE is_read = true;

-- Add constraint to ensure read_at is set when is_read is true
ALTER TABLE notifications ADD CONSTRAINT check_read_at_consistency 
    CHECK ((is_read = false AND read_at IS NULL) OR (is_read = true));

-- DOWN
DROP INDEX IF EXISTS idx_notifications_cleanup;
DROP INDEX IF EXISTS idx_notifications_user_type;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP TABLE IF EXISTS notifications;
DROP TYPE IF EXISTS notification_type;