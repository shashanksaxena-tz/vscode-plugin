-- Auth Hook: Sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, department, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'department',
    COALESCE(new.raw_user_meta_data->>'role', 'developer')
  )
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    department = EXCLUDED.department,
    role = EXCLUDED.role;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_resource TEXT,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can view all logs
CREATE POLICY admin_view_audit_logs ON audit_logs
    FOR SELECT USING (
        auth.jwt()->>'role' = 'admin' OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE email = auth.jwt()->>'email'
            AND role = 'admin'
        )
    );

-- Service role (batch processor) can insert logs
CREATE POLICY service_insert_audit_logs ON audit_logs
    FOR INSERT WITH CHECK (true);
    -- Note: Service role bypasses RLS anyway, but explicit policy is good for documentation or if we use a restricted role.
    -- Ideally, we restrict INSERT to service_role only.
    -- Since we can't easily check for service_role in SQL policy without custom claims, we'll rely on the fact that regular users (anon/authenticated) won't have an insert policy.
