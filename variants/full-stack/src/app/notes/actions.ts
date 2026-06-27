"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runScoped } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { inngest } from "@/inngest/client";
import { ok, err, type Result } from "@/lib/result";

const NoteInput = z.object({ content: z.string().min(1).max(2000) });

export async function createNote(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const userId = await requireUserId();
  const parsed = NoteInput.safeParse({ content: formData.get("content") });
  if (!parsed.success) return err("Write something first (up to 2000 characters).");

  const note = await runScoped(userId, (tx) =>
    tx.note.create({ data: { userId, content: parsed.data.content } }),
  );

  await inngest.send({ name: "note/created", data: { noteId: note.id } });
  revalidatePath("/notes");
  return ok(null);
}

export async function deleteNote(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = z.uuid().parse(formData.get("id"));
  // RLS + the runScoped context guarantee a user can only delete their own row.
  await runScoped(userId, (tx) => tx.note.deleteMany({ where: { id, userId } }));
  revalidatePath("/notes");
}
