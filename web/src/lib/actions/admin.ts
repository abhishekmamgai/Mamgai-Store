"use server";

import { revalidatePath } from "next/cache";
import { requireStoreId, logAudit, getSessionUser } from "@/lib/auth/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getStoreUsers() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, created_at")
    .eq("store_id", storeId)
    .order("created_at");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateUserProfile(formData: FormData) {
  const storeId = await requireStoreId();
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", user.id)
    .eq("store_id", storeId);

  if (error) throw new Error(error.message);
  revalidatePath("/app/admin");
  revalidatePath("/app/settings");
}

export async function updateUserRole(formData: FormData) {
  const storeId = await requireStoreId();
  const user = await getSessionUser();
  const supabase = await createSupabaseServerClient();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (me?.role !== "owner") throw new Error("Only owner can change roles");

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "staff");

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) throw new Error(error.message);
  await logAudit(storeId, "role_updated", "profile", id, { role });
  revalidatePath("/app/admin");
}

export async function getErrorLogs(limit = 30) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("error_logs")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportBackupJSON() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const [markets, bills, items, products, sales] = await Promise.all([
    supabase.from("markets").select("*").eq("store_id", storeId),
    supabase.from("bills").select("*").eq("store_id", storeId),
    supabase.from("bill_items").select("*").eq("store_id", storeId),
    supabase.from("products").select("*").eq("store_id", storeId),
    supabase.from("daily_sales").select("*").eq("store_id", storeId),
  ]);

  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      store_id: storeId,
      markets: markets.data,
      bills: bills.data,
      bill_items: items.data,
      products: products.data,
      daily_sales: sales.data,
    },
    null,
    2
  );
}
