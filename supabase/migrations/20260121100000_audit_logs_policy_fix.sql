-- Security Hardening: Fix Audit Logs Policy
-- The previous policy 'service_insert_audit_logs' with 'WITH CHECK (true)' was too permissive.
-- We are dropping it because the batch-processor uses the Service Role (bypassing RLS),
-- so no explicit INSERT policy is needed for it.
-- Regular users should not be able to insert audit logs directly.

DROP POLICY IF EXISTS service_insert_audit_logs ON audit_logs;

-- If we need to allow specific authenticated users (e.g. admins) to insert logs via the dashboard client,
-- we could add a restricted policy here. But for now, we assume only backend services write logs.
-- If the dashboard needs to write logs, it should do so via a server-side route that uses the Service Role, or we define a strict policy.

-- For now, we leave NO insert policy for non-service-role users, effectively disabling inserts for them.
