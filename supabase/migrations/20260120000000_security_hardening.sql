-- Security Hardening Migration

-- 1. Enable RLS on users table (it was missing in initial schema)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Policies for users table
-- Developers can only see their own profile
CREATE POLICY dev_own_profile ON users
    FOR SELECT USING (
        email = auth.jwt()->>'email'
    );

-- Managers and Admins can see all users (needed to look up departments)
CREATE POLICY manager_admin_view_all_users ON users
    FOR SELECT USING (
        auth.jwt()->>'role' IN ('manager', 'admin')
    );

-- 3. Refine Daily Metrics Policies
DROP POLICY IF EXISTS dev_own_metrics ON daily_metrics;

-- User sees own metrics
CREATE POLICY view_own_metrics ON daily_metrics
    FOR SELECT USING (
        user_id = auth.jwt()->>'email'
    );

-- Admin sees all
CREATE POLICY admin_view_all_metrics ON daily_metrics
    FOR SELECT USING (
        auth.jwt()->>'role' = 'admin'
    );

-- Manager sees metrics ONLY for users in their department
-- We use a subquery to check if the target user's department matches the manager's department
CREATE POLICY manager_view_team_metrics ON daily_metrics
    FOR SELECT USING (
        auth.jwt()->>'role' = 'manager' AND
        (
            SELECT department FROM users WHERE email = daily_metrics.user_id
        ) = (
            SELECT department FROM users WHERE email = auth.jwt()->>'email'
        )
    );

-- 4. Refine Quality Scores Policies
DROP POLICY IF EXISTS dev_own_scores ON quality_scores;

-- User sees own scores
CREATE POLICY view_own_scores ON quality_scores
    FOR SELECT USING (
        user_id = auth.jwt()->>'email'
    );

-- Admin sees all
CREATE POLICY admin_view_all_scores ON quality_scores
    FOR SELECT USING (
        auth.jwt()->>'role' = 'admin'
    );

-- Manager sees scores ONLY for users in their department
CREATE POLICY manager_view_team_scores ON quality_scores
    FOR SELECT USING (
        auth.jwt()->>'role' = 'manager' AND
        (
            SELECT department FROM users WHERE email = quality_scores.user_id
        ) = (
            SELECT department FROM users WHERE email = auth.jwt()->>'email'
        )
    );
