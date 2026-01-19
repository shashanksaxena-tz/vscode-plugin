-- Migration: Audit Logging System
-- Date: 2026-01-21
-- Description: Creates audit_logs table and RLS policies for tracking sensitive actions.

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who performed the action
    action TEXT NOT NULL, -- e.g., 'update_role', 'delete_cohort', 'view_sensitive_data'
    target_resource TEXT NOT NULL, -- e.g., 'users', 'cohorts'
    target_id TEXT, -- ID of the modified resource
    details JSONB DEFAULT '{}', -- Old/New values or other context
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index for searching logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 3. Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Admins can view all logs
CREATE POLICY admin_view_audit_logs ON audit_logs
    FOR SELECT USING (
        auth.jwt()->>'role' = 'admin'
    );

-- System services (service_role) can insert logs
CREATE POLICY service_insert_audit_logs ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Managers can view logs relevant to their department (optional, sticking to Admin-only for now for stricter security)
-- If Managers need to see logs, we'd need to join with users table. For now, strictly Admin.

-- 5. Helper function to insert audit log (useful for SQL-level triggers or RPC calls)
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action TEXT,
    p_target_resource TEXT,
    p_target_id TEXT,
    p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_user_id UUID;
BEGIN
    -- Try to get user ID from auth context
    v_user_id := auth.uid();

    INSERT INTO audit_logs (user_id, action, target_resource, target_id, details)
    VALUES (v_user_id, p_action, p_target_resource, p_target_id, p_details)
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
