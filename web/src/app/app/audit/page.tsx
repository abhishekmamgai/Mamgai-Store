import { getAuditLogs } from "@/lib/actions/misc";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function AuditPage() {
  let logs = [];
  let error = "";
  try { logs = await getAuditLogs(100); } catch (e) { error = e instanceof Error ? e.message : "Error"; }

  if (error) {
    return <div><h1 className="text-2xl font-semibold">Audit Trail</h1><Card className="mt-4 p-5 text-sm">{error}. <Link href="/app/setup" className="underline">Setup</Link></Card></div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Audit Trail</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr><th className="p-3 text-left">Action</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Time</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="p-3">{l.action}</td>
                <td className="p-3 text-muted-foreground">{l.entity_type ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{new Date(l.created_at).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
