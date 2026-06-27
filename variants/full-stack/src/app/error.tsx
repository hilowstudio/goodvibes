"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto mt-24 max-w-sm text-center">
      <h1 className="mb-2 font-serif text-xl">Something went wrong</h1>
      <p className="mb-4 text-secondary">That page hit a problem. Try again.</p>
      <button
        onClick={reset}
        className="min-h-11 rounded-md bg-primary px-4 text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Try again
      </button>
    </main>
  );
}
