ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
-- FORCE so the table owner is also subject to RLS (owners bypass plain RLS).
ALTER TABLE "notes" FORCE ROW LEVEL SECURITY;

-- Fail closed: current_setting(..., true) returns NULL when unset, and
-- "user_id" = NULL is never true, so an unset context sees zero rows.
CREATE POLICY "notes_select_own" ON "notes"
  FOR SELECT
  USING ("user_id" = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "notes_insert_own" ON "notes"
  FOR INSERT
  WITH CHECK ("user_id" = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "notes_update_own" ON "notes"
  FOR UPDATE
  USING ("user_id" = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK ("user_id" = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "notes_delete_own" ON "notes"
  FOR DELETE
  USING ("user_id" = current_setting('app.current_user_id', true)::uuid);
