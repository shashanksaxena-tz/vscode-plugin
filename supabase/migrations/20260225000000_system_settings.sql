-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Admins can insert/update settings
CREATE POLICY admin_all_system_settings ON system_settings
    FOR ALL USING (
        auth.jwt()->>'role' = 'admin'
    ) WITH CHECK (
        auth.jwt()->>'role' = 'admin'
    );

-- Everyone can read settings
CREATE POLICY public_read_system_settings ON system_settings
    FOR SELECT USING (true);
