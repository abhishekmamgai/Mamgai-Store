import { getMarkets } from "@/lib/actions/markets";
import { getSessionUser } from "@/lib/auth/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BillScanWorkflow } from "./bill-scan-workflow";
import Link from "next/link";

async function getDefaultUserName() {
  const user = await getSessionUser();
  if (!user) return "";
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  return data?.full_name ?? user.email?.split("@")[0] ?? "";
}

export default async function BillScanPage() {
  let markets = [];
  let dbError = "";
  let defaultUserName = "";

  try {
    [markets, defaultUserName] = await Promise.all([getMarkets(), getDefaultUserName()]);
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Database error";
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bill Scanner</h1>
        <p className="text-sm text-muted-foreground">
          Market → Camera → OCR → Database. Hindi & English bills supported.
        </p>
      </div>

      {dbError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Database setup required</p>
          <p className="mt-1">{dbError}</p>
          <Link href="/app/setup" className="mt-2 inline-block underline">Setup instructions →</Link>
        </div>
      ) : (
        <BillScanWorkflow markets={markets} defaultUserName={defaultUserName} />
      )}
    </div>
  );
}
