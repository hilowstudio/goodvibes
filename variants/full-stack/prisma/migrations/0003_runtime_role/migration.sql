-- The role the app logs in as. It is created here, with no password, so that any
-- later migration can grant it access to the table that migration adds. It cannot
-- log in until prisma/sql/runtime-role.sql gives it a password.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON "notes" TO app_runtime;
-- No table ownership, no BYPASSRLS: RLS is a real floor for this role.
