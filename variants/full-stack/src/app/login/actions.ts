"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { err, type Result } from "@/lib/result";

const Credentials = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function signIn(_prev: Result<null> | null, formData: FormData): Promise<Result<null>> {
  const parsed = Credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return err("Enter a valid email and a password of at least 8 characters.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return err("That email and password did not match. Try again.");
  redirect("/notes");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
