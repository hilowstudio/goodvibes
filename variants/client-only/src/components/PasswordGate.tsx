import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const REQUIRED = import.meta.env.VITE_GATE_PASSWORD ?? "";
const UNLOCK_KEY = "goodvibes-gate-unlocked";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = React.useState(
    () => REQUIRED === "" || sessionStorage.getItem(UNLOCK_KEY) === "1",
  );
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState(false);

  if (unlocked) return <>{children}</>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value === REQUIRED) {
      sessionStorage.setItem(UNLOCK_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
    }
  }

  return (
    <main className="mx-auto mt-24 max-w-sm">
      <Card>
        <h1 className="mb-2 font-serif text-xl">Enter the password</h1>
        <p className="mb-4 text-sm text-secondary">
          This keeps casual visitors out. It is not real security; anyone technical can get past it.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Password"
            autoFocus
          />
          {error ? <p role="alert" className="text-sm text-status-danger">That password did not match. Try again.</p> : null}
          <Button type="submit">Continue</Button>
        </form>
      </Card>
    </main>
  );
}
