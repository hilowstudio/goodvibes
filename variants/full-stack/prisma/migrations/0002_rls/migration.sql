ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
-- FORCE so the table owner is also subject to RLS (owners bypass plain RLS).
ALTER TABLE "notes" FORCE ROW LEVEL SECURITY;

-- Fail closed. current_setting(..., true) is NULL when the GUC was never set,
-- but a custom GUC resets to '' (empty string) after a SET LOCAL on a pooled
-- connection, and ''::uuid throws (22P02). nullif(..., '') maps both '' and the
-- unset case to NULL, and "user_id" = NULL is never true, so an unset context
-- sees zero rows instead of erroring.
CREATE POLICY "notes_select_own" ON "notes"
  FOR SELECT
  USING ("user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY "notes_insert_own" ON "notes"
  FOR INSERT
  WITH CHECK ("user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY "notes_update_own" ON "notes"
  FOR UPDATE
  USING ("user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK ("user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid);

CREATE POLICY "notes_delete_own" ON "notes"
  FOR DELETE
  USING ("user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid);
