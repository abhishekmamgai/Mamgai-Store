"use server";

import { revalidatePath } from "next/cache";
import { requireStoreId, logAudit } from "@/lib/auth/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getMarkets() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAllMarkets() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .eq("store_id", storeId)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addMarket(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Market name required");

  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("markets")
    .insert({ store_id: storeId, name })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(storeId, "market_created", "market", data.id, { name });
  revalidatePath("/app/markets");
  revalidatePath("/app/bill-scan");
  return data;
}

export async function deleteMarket(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Market id required");

  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("markets")
    .update({ is_active: false })
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) throw new Error(error.message);

  await logAudit(storeId, "market_deleted", "market", id);
  revalidatePath("/app/markets");
  revalidatePath("/app/bill-scan");
}
