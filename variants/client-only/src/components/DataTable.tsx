import * as React from "react";
import { queryVisitors, type VisitorRow } from "@/lib/duckdb";
import { Card } from "@/components/ui/card";

export function DataTable() {
  const [rows, setRows] = React.useState<VisitorRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    queryVisitors()
      .then((result) => {
        if (!active) return;
        if (result.ok) setRows(result.data);
        else setError(result.error);
      })
      .catch(() => {
        if (active) setError("Could not load the data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <p role="alert" className="text-status-danger">{error}</p>;
  if (loading) return <p className="text-secondary">Loading...</p>;

  return (
    <Card>
      <table className="w-full text-left">
        <thead><tr><th scope="col" className="pb-2">Month</th><th scope="col" className="pb-2">Visitors</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}><td className="py-1">{r.month}</td><td className="py-1">{r.visitors}</td></tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
