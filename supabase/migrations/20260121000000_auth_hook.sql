-- Migration: Auth Hook for User Creation
-- Date: 2026-01-21
-- Description: Automatically populates public.users when a new user signs up via Supabase Auth.

-- Function to handle new user insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, department, created_at, last_active)
  VALUES (
    new.id,
    new.email,
    -- Try to get name from metadata, fallback to email username if needed, or NULL
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    -- Default role is developer, but allow override via metadata (careful with this in prod)
    COALESCE(new.raw_user_meta_data->>'role', 'developer'),
    -- Department is critical for RLS
    new.raw_user_meta_data->>'department',
    new.created_at,
    new.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    last_active = EXCLUDED.last_active;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users (if any) to ensure consistency
INSERT INTO public.users (id, email, created_at, last_active)
SELECT
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
