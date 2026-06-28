"use server";

import { revalidatePath } from "next/cache";
import { requireStoreId, logAudit } from "@/lib/auth/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getDailySales(date?: string) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const saleDate = date ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_sales")
    .select("*")
    .eq("store_id", storeId)
    .eq("sale_date", saleDate)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getTodaySalesSummary() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("daily_sales")
    .select("*")
    .eq("store_id", storeId)
    .eq("sale_date", today)
    .maybeSingle();

  const cash = Number(data?.cash_sale ?? 0);
  const upi = Number(data?.upi_sale ?? 0);
  const credit = Number(data?.credit_sale ?? 0);
  const expenses = Number(data?.expenses ?? 0);

  return {
    total: cash + upi + credit,
    cash,
    upi,
    credit,
    expenses,
    net: cash + upi - expenses,
  };
}

export async function saveDailySales(formData: FormData) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const payload = {
    store_id: storeId,
    sale_date: String(formData.get("sale_date") ?? new Date().toISOString().slice(0, 10)),
    cash_sale: Number(formData.get("cash_sale") ?? 0),
    upi_sale: Number(formData.get("upi_sale") ?? 0),
    credit_sale: Number(formData.get("credit_sale") ?? 0),
    expenses: Number(formData.get("expenses") ?? 0),
    opening_cash: Number(formData.get("opening_cash") ?? 0),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { data, error } = await supabase
    .from("daily_sales")
    .upsert(payload, { onConflict: "store_id,sale_date" })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(storeId, "daily_sales_saved", "daily_sales", data.id, payload);
  revalidatePath("/app/daily-sales");
  revalidatePath("/app/dashboard");
  return data;
}

export async function getSalesHistory(limit = 30) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("daily_sales")
    .select("*")
    .eq("store_id", storeId)
    .order("sale_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
