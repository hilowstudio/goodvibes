import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto mt-24 max-w-sm text-center">
      <h1 className="mb-2 font-serif text-xl">Page not found</h1>
      <Link href="/notes" className="text-accent underline">Go to your notes</Link>
    </main>
  );
}
