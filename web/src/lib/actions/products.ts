"use server";

import { revalidatePath } from "next/cache";
import { requireStoreId, logAudit } from "@/lib/auth/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getProducts() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, markets(name)")
    .eq("store_id", storeId)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getLowStockProducts() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const { data: all, error } = await supabase
    .from("products")
    .select("*, markets(name)")
    .eq("store_id", storeId)
    .order("stock_qty");

  if (error) throw new Error(error.message);
  return (all ?? []).filter((p) => Number(p.stock_qty) <= Number(p.low_stock_threshold));
}

export async function addProduct(formData: FormData) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const payload = {
    store_id: storeId,
    name: String(formData.get("name") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim() || null,
    purchase_price: Number(formData.get("purchase_price") ?? 0),
    selling_price: Number(formData.get("selling_price") ?? 0),
    stock_qty: Number(formData.get("stock_qty") ?? 0),
    stock_unit: String(formData.get("stock_unit") ?? "piece"),
    market_id: String(formData.get("market_id") ?? "") || null,
    low_stock_threshold: Number(formData.get("low_stock_threshold") ?? 5),
  };

  if (!payload.name) throw new Error("Product name required");

  const { data, error } = await supabase.from("products").insert(payload).select().single();
  if (error) throw new Error(error.message);

  await logAudit(storeId, "product_created", "product", data.id, payload);
  revalidatePath("/app/products");
  revalidatePath("/app/inventory");
  return data;
}

export async function updateProduct(formData: FormData) {
  const storeId = await requireStoreId();
  const id = String(formData.get("id") ?? "");
  const supabase = await createSupabaseServerClient();

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    purchase_price: Number(formData.get("purchase_price") ?? 0),
    selling_price: Number(formData.get("selling_price") ?? 0),
    stock_qty: Number(formData.get("stock_qty") ?? 0),
    stock_unit: String(formData.get("stock_unit") ?? "piece"),
    market_id: String(formData.get("market_id") ?? "") || null,
    low_stock_threshold: Number(formData.get("low_stock_threshold") ?? 5),
  };

  const { error } = await supabase
    .from("products")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) throw new Error(error.message);
  revalidatePath("/app/products");
  revalidatePath("/app/inventory");
}

export async function updateProductSellingPrices(prices: { productId: string; sellingPrice: number }[]) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  for (const item of prices) {
    const { error } = await supabase
      .from("products")
      .update({
        selling_price: item.sellingPrice,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.productId)
      .eq("store_id", storeId);

    if (error) {
      console.error(`Failed to update selling price for product ${item.productId}:`, error.message);
    }
  }

  revalidatePath("/app/products");
  revalidatePath("/app/inventory");
  revalidatePath("/app/bill-scan");
}
