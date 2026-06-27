CREATE TABLE "notes" (
  "id"         uuid        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid        NOT NULL,
  "content"    text        NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notes_user_id_idx" ON "notes" ("user_id");
