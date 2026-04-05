-- Create In-IDE Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Developers see only their own notifications
CREATE POLICY dev_own_notifications ON notifications
    FOR SELECT USING (
        auth.jwt()->>'email' = user_id
    );

-- Developers can mark their own notifications as read
CREATE POLICY dev_update_notifications ON notifications
    FOR UPDATE USING (
        auth.jwt()->>'email' = user_id
    );

-- Create index for queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;
