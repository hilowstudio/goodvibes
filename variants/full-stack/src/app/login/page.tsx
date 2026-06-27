"use client";
import { useActionState } from "react";
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <main className="mx-auto mt-24 max-w-sm">
      <Card>
        <h1 className="mb-4 font-serif text-xl">Sign in</h1>
        <form action={action} className="flex flex-col gap-3">
          <label className="text-sm" htmlFor="email">Email</label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          <label className="text-sm" htmlFor="password">Password</label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
          {state && !state.ok ? (
            <p role="alert" className="text-sm text-status-danger">{state.error}</p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
