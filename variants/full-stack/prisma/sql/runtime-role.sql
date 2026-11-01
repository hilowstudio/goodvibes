-- Run after the migrations, as the table owner / a privileged role, over the
-- direct connection. Idempotent. Run it once per database.
-- The password comes from the GUC goodvibes.runtime_password, so set it in the same
-- session first: SET goodvibes.runtime_password = 'the-password';
-- VALID UNTIL 'infinity' matters on Supabase: its pooler rejects an expired role.
DO $$
BEGIN
  EXECUTE format(
    'ALTER ROLE app_runtime LOGIN PASSWORD %L VALID UNTIL %L',
    current_setting('goodvibes.runtime_password'),
    'infinity'
  );
END
$$;
