import { getAllMarkets } from "@/lib/actions/markets";
import { getAllBills } from "@/lib/actions/bills";
import { getStoreUsers } from "@/lib/actions/admin";
import { getSessionUser } from "@/lib/auth/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminClient } from "./admin-client";
import Link from "next/link";

export default async function AdminPage() {
  let markets: Awaited<ReturnType<typeof getAllMarkets>> = [];
  let users: Awaited<ReturnType<typeof getStoreUsers>> = [];
  let bills: Awaited<ReturnType<typeof getAllBills>>["bills"] = [];
  let error = "";
  let isOwner = false;
  let currentUserId = "";

  try {
    const user = await getSessionUser();
    currentUserId = user?.id ?? "";
    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
    isOwner = profile?.role === "owner";

    const [m, u, b] = await Promise.all([getAllMarkets(), getStoreUsers(), getAllBills(1, 100)]);
    markets = m;
    users = u;
    bills = b.bills;
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-2 text-sm">{error}. <Link href="/app/setup" className="underline">Setup</Link></p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Markets, users, bills, export & backup</p>
      </div>
      <AdminClient markets={markets} users={users} bills={bills} isOwner={isOwner} currentUserId={currentUserId} />
    </div>
  );
}
