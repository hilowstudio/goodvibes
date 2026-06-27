import * as React from "react";
import { z } from "zod";
import { queryVisitors } from "@/lib/duckdb";
import { parse } from "@/lib/parse";
import { Card } from "@/components/ui/card";

const Rows = z.array(z.object({ month: z.string(), visitors: z.number() }));

export function DataTable() {
  const [rows, setRows] = React.useState<Array<{ month: string; visitors: number }>>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    queryVisitors()
      .then((data) => {
        if (!active) return;
        const parsed = parse(Rows, data);
        if (parsed.ok) setRows(parsed.data);
        else setError(parsed.error);
      })
      .catch(() => active && setError("Could not load the data."));
    return () => { active = false; };
  }, []);

  if (error) return <p role="alert" className="text-status-danger">{error}</p>;

  return (
    <Card>
      <table className="w-full text-left">
        <thead><tr><th className="pb-2">Month</th><th className="pb-2">Visitors</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}><td className="py-1">{r.month}</td><td className="py-1">{r.visitors}</td></tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
