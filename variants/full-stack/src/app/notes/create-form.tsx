"use client";
import { useActionState } from "react";
import { createNote } from "./actions";
import { Button } from "@/components/ui/button";

export function CreateForm() {
  const [state, action, pending] = useActionState(createNote, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <textarea
        name="content"
        rows={3}
        className="w-full rounded-md border border-border bg-surface p-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        placeholder="Write a note"
        required
      />
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-status-danger">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Add note"}
      </Button>
    </form>
  );
}
