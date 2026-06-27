import { requireUserId } from "@/lib/auth";
import { runScoped } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";
import { CreateForm } from "./create-form";
import { deleteNote } from "./actions";

export default async function NotesPage() {
  const userId = await requireUserId();
  const notes = await runScoped(userId, (tx) =>
    tx.note.findMany({ orderBy: { createdAt: "desc" } }),
  );

  return (
    <main className="mx-auto mt-12 max-w-xl px-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl">Your notes</h1>
        <form action={signOut}>
          <Button variant="ghost" type="submit">Sign out</Button>
        </form>
      </div>
      <Card className="mb-6"><CreateForm /></Card>
      <ul className="flex flex-col gap-3">
        {notes.map((note) => (
          <li key={note.id}>
            <Card className="flex items-start justify-between gap-4">
              <p className="text-base">{note.content}</p>
              <form action={deleteNote}>
                <input type="hidden" name="id" value={note.id} />
                <Button variant="danger" type="submit" aria-label="Delete note">Delete</Button>
              </form>
            </Card>
          </li>
        ))}
        {notes.length === 0 ? (
          <li className="text-secondary">No notes yet. Add your first one above.</li>
        ) : null}
      </ul>
    </main>
  );
}
