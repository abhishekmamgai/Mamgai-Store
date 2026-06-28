import { readFileSync } from "fs";
import { join } from "path";
import { checkDatabaseReady } from "@/lib/actions/misc";

export default async function SetupPage() {
  const ready = await checkDatabaseReady().catch(() => false);
  let sql = "";
  try {
    sql = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf8");
  } catch {
    sql = "Could not load schema.sql";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Database Setup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ek baar ye SQL Supabase me run karein — uske baad sab features kaam karenge.
        </p>
      </div>

      <div
        className={[
          "rounded-lg border p-4 text-sm",
          ready ? "border-green-500/40 bg-green-50 dark:bg-green-950" : "border-amber-500/40 bg-amber-50 dark:bg-amber-950",
        ].join(" ")}
      >
        Status:{" "}
        <strong>{ready ? "✓ Database ready" : "✗ Tables not found — run SQL below"}</strong>
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          Open{" "}
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Supabase Dashboard
          </a>
        </li>
        <li>Go to SQL Editor → New query</li>
        <li>Copy-paste <strong>schema.sql</strong> below → Run</li>
        <li>Then run <strong>migration-v2.sql</strong> (adds bill scan fields, error logs)</li>
        <li>
          Go to Storage → Create bucket named <code className="rounded bg-muted px-1">bill-images</code>{" "}
          (public)
        </li>
        <li>Refresh this page</li>
      </ol>

      <pre className="max-h-96 overflow-auto rounded-lg border bg-muted p-4 text-xs">{sql}</pre>

      {ready && (
        <a href="/app/dashboard" className="inline-block rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
          Go to Dashboard →
        </a>
      )}
    </div>
  );
}
