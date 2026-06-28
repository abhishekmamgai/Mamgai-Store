"use server";

import { revalidatePath } from "next/cache";
import { requireStoreId, logAudit } from "@/lib/auth/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSuppliers() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("store_id", storeId)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addSupplier(formData: FormData) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const payload = {
    store_id: storeId,
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    gst_number: String(formData.get("gst_number") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  if (!payload.name) throw new Error("Supplier name required");

  const { data, error } = await supabase.from("suppliers").insert(payload).select().single();
  if (error) throw new Error(error.message);

  await logAudit(storeId, "supplier_created", "supplier", data.id, payload);
  revalidatePath("/app/suppliers");
  return data;
}

export async function getPurchasePlan() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const planDate = tomorrow.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("purchase_plan")
    .select("*")
    .eq("store_id", storeId)
    .eq("plan_date", planDate)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addPurchasePlanItem(formData: FormData) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { error } = await supabase.from("purchase_plan").insert({
    store_id: storeId,
    plan_date: tomorrow.toISOString().slice(0, 10),
    item_name: String(formData.get("item_name") ?? "").trim(),
    quantity: String(formData.get("quantity") ?? "").trim() || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/app/purchase-plan");
}

export async function updatePurchasePlanStatus(formData: FormData) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "pending");

  const { error } = await supabase
    .from("purchase_plan")
    .update({ status })
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) throw new Error(error.message);
  revalidatePath("/app/purchase-plan");
}

export async function getMilkEntry(date?: string) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const entryDate = date ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("milk_planner")
    .select("*")
    .eq("store_id", storeId)
    .eq("entry_date", entryDate)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveMilkEntry(formData: FormData) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const payload = {
    store_id: storeId,
    entry_date: String(formData.get("entry_date") ?? new Date().toISOString().slice(0, 10)),
    today_milk: Number(formData.get("today_milk") ?? 0),
    tomorrow_requirement: Number(formData.get("tomorrow_requirement") ?? 0),
    remaining_stock: Number(formData.get("remaining_stock") ?? 0),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { error } = await supabase
    .from("milk_planner")
    .upsert(payload, { onConflict: "store_id,entry_date" });

  if (error) throw new Error(error.message);
  revalidatePath("/app/milk");
}

export async function getNotes() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("daily_notes")
    .select("*")
    .eq("store_id", storeId)
    .order("note_date", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addNote(formData: FormData) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("daily_notes").insert({
    store_id: storeId,
    note_date: String(formData.get("note_date") ?? new Date().toISOString().slice(0, 10)),
    content: String(formData.get("content") ?? "").trim(),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/app/notes");
}

export async function getAuditLogs(limit = 50) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getTodayPurchases() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("bills")
    .select("total_amount")
    .eq("store_id", storeId)
    .eq("bill_date", today);

  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, b) => sum + Number(b.total_amount), 0);
}

export async function checkDatabaseReady() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("markets").select("id").limit(1);
  return !error;
}
