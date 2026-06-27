import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PasswordGate } from "@/components/PasswordGate";
import { DataTable } from "@/components/DataTable";

export default function App() {
  return (
    <ErrorBoundary>
      <PasswordGate>
        <main className="mx-auto mt-12 max-w-xl px-4">
          <h1 className="mb-6 font-serif text-2xl">Visitors by month</h1>
          <DataTable />
        </main>
      </PasswordGate>
    </ErrorBoundary>
  );
}
