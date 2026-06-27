-- Run as the table owner / a privileged role. Idempotent.
-- Password is provided by the caller via the GUC goodvibes.runtime_password.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    EXECUTE format(
      'CREATE ROLE app_runtime LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE',
      current_setting('goodvibes.runtime_password')
    );
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON "notes" TO app_runtime;
-- No table ownership, no BYPASSRLS: RLS is a real floor for this role.
