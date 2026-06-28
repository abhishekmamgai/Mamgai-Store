"use server";

import { revalidatePath } from "next/cache";
import { requireStoreId, logAudit, getSessionUser } from "@/lib/auth/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BillLineInput } from "@/lib/types";
import { createBillFingerprint } from "@/lib/ocr/parse-bill";

export type SaveBillInput = {
  market_id: string;
  scanned_by_name: string;
  supplier_name: string;
  bill_date: string;
  bill_number?: string | null;
  gst_amount?: number;
  tax_amount?: number;
  grand_total?: number;
  notes?: string;
  items: BillLineInput[];
  image_base64?: string;
  ocr_raw_text?: string;
};

async function logError(storeId: string | null, source: string, message: string, details?: unknown) {
  try {
    const user = await getSessionUser();
    const supabase = await createSupabaseServerClient();
    await supabase.from("error_logs").insert({
      store_id: storeId,
      user_id: user?.id ?? null,
      source,
      message,
      details: details ? JSON.parse(JSON.stringify(details)) : null,
    });
  } catch {
    /* ignore logging failures */
  }
}

async function findOrCreateProduct(
  storeId: string,
  marketId: string,
  name: string,
  purchasePrice: number,
  unit: string,
  qty: number,
  billId: string
) {
  const supabase = await createSupabaseServerClient();
  const normalized = name.trim();

  let { data: existing } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .ilike("name", normalized)
    .maybeSingle();

  // If no exact match, try AI-based name normalization
  if (!existing) {
    try {
      const { data: allProducts } = await supabase
        .from("products")
        .select("name, id, purchase_price, selling_price, stock_qty, purchase_count")
        .eq("store_id", storeId);

      if (allProducts && allProducts.length > 0) {
        const { matchProductWithAI } = await import("./openai");
        const existingNames = allProducts.map((p) => p.name);
        const matchName = await matchProductWithAI(normalized, existingNames);
        
        if (matchName && matchName !== "NEW") {
          const matchedProd = allProducts.find((p) => p.name === matchName);
          if (matchedProd) {
            const { data: existingMatched } = await supabase
              .from("products")
              .select("*")
              .eq("id", matchedProd.id)
              .single();
            
            if (existingMatched) {
              existing = existingMatched;
            }
          }
        }
      }
    } catch (e) {
      console.error("AI normalization error during product search:", e);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  if (existing) {
    const oldPrice = Number(existing.purchase_price);
    const priceChanged = Math.abs(oldPrice - purchasePrice) > 0.001;

    if (priceChanged) {
      await supabase.from("price_history").insert({
        store_id: storeId,
        product_id: existing.id,
        market_id: marketId,
        old_price: oldPrice,
        new_price: purchasePrice,
        bill_id: billId,
      });
    }

    await supabase
      .from("products")
      .update({
        purchase_price: purchasePrice,
        market_id: marketId,
        stock_qty: Number(existing.stock_qty) + qty,
        stock_unit: unit,
        last_purchase_date: today,
        purchase_count: Number(existing.purchase_count) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    return { productId: existing.id, priceChanged, oldPrice, oldSellingPrice: Number(existing.selling_price) };
  }

  const { data: created, error } = await supabase
    .from("products")
    .insert({
      store_id: storeId,
      name: normalized,
      market_id: marketId,
      purchase_price: purchasePrice,
      stock_qty: qty,
      stock_unit: unit,
      last_purchase_date: today,
      purchase_count: 1,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { productId: created.id, priceChanged: false, oldPrice: null, oldSellingPrice: 0 };
}

export async function saveBill(input: SaveBillInput) {
  let storeId: string;
  try {
    storeId = await requireStoreId();
  } catch (e) {
    await logError(null, "saveBill", e instanceof Error ? e.message : "Store error");
    throw e;
  }

  const supabase = await createSupabaseServerClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!input.market_id) throw new Error("Market selection is required before scanning");
  if (!input.scanned_by_name?.trim()) throw new Error("Scanner name is required");
  if (!input.items.length) throw new Error("At least one bill item is required");

  const itemsTotal = input.items.reduce((s, i) => s + i.quantity * i.purchase_price, 0);
  const grandTotal = input.grand_total ?? itemsTotal + (input.gst_amount ?? 0) + (input.tax_amount ?? 0);

  const fingerprint = createBillFingerprint({
    market_id: input.market_id,
    bill_number: input.bill_number,
    bill_date: input.bill_date,
    grand_total: grandTotal,
    item_count: input.items.length,
  });

  const { data: duplicate } = await supabase
    .from("bills")
    .select("id, bill_number, created_at")
    .eq("store_id", storeId)
    .eq("bill_fingerprint", fingerprint)
    .maybeSingle();

  if (duplicate) {
    throw new Error(
      `Duplicate bill detected (Bill #${duplicate.bill_number ?? duplicate.id.slice(0, 8)}). Already saved on ${new Date(duplicate.created_at).toLocaleDateString("en-IN")}.`
    );
  }

  let imageUrl: string | null = null;
  if (input.image_base64) {
    try {
      const base64 = input.image_base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      const fileName = `${storeId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("bill-images")
        .upload(fileName, buffer, { contentType: "image/jpeg", upsert: false });

      if (uploadError) {
        await logError(storeId, "storage", uploadError.message, { fileName });
      } else {
        const { data: urlData } = supabase.storage.from("bill-images").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    } catch (e) {
      await logError(storeId, "storage", "Image upload failed", { error: String(e) });
    }
  }

  const { data: bill, error: billError } = await supabase
    .from("bills")
    .insert({
      store_id: storeId,
      market_id: input.market_id,
      supplier_name: input.supplier_name.trim() || null,
      bill_date: input.bill_date,
      bill_number: input.bill_number?.trim() || null,
      scanned_by_name: input.scanned_by_name.trim(),
      gst_amount: input.gst_amount ?? 0,
      tax_amount: input.tax_amount ?? 0,
      grand_total: grandTotal,
      total_amount: grandTotal,
      image_url: imageUrl,
      notes: input.notes ?? null,
      ocr_raw_text: input.ocr_raw_text ?? null,
      bill_fingerprint: fingerprint,
      scanned_at: new Date().toISOString(),
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (billError) {
    await logError(storeId, "saveBill", billError.message, input);
    throw new Error(billError.message);
  }

  const priceAlerts: {
    productId: string;
    product: string;
    oldPrice: number;
    newPrice: number;
    oldSellingPrice: number;
  }[] = [];

  for (const item of input.items) {
    const totalPrice = item.quantity * item.purchase_price;
    const { productId, priceChanged, oldPrice, oldSellingPrice } = await findOrCreateProduct(
      storeId,
      input.market_id,
      item.product_name,
      item.purchase_price,
      item.unit,
      item.quantity,
      bill.id
    );

    if (priceChanged && oldPrice !== null) {
      priceAlerts.push({
        productId,
        product: item.product_name,
        oldPrice,
        newPrice: item.purchase_price,
        oldSellingPrice,
      });
    }

    await supabase.from("bill_items").insert({
      bill_id: bill.id,
      store_id: storeId,
      market_id: input.market_id,
      product_id: productId,
      product_name: item.product_name.trim(),
      quantity: item.quantity,
      unit: item.unit,
      purchase_price: item.purchase_price,
      total_price: totalPrice,
      category: item.category ?? null,
    });
  }

  await logAudit(storeId, "bill_scanned", "bill", bill.id, {
    market_id: input.market_id,
    scanned_by: input.scanned_by_name,
    items: input.items.length,
    total: grandTotal,
  });

  revalidatePath("/app/dashboard");
  revalidatePath("/app/bill-scan");
  revalidatePath("/app/search");
  revalidatePath("/app/admin");
  revalidatePath("/app/products");

  return { billId: bill.id, priceAlerts, totalAmount: grandTotal, billNumber: bill.bill_number };
}

export async function getAllBills(page = 1, limit = 20) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const from = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("bills")
    .select("*, markets(name), bill_items(count)", { count: "exact" })
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw new Error(error.message);
  return { bills: data ?? [], total: count ?? 0, page, limit };
}

export async function getRecentBills(limit = 10) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bills")
    .select("*, markets(name), bill_items(count)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBillsByMarket() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bill_items")
    .select("product_name, purchase_price, quantity, markets(name), created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportBillsCSV() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const { data: items, error } = await supabase
    .from("bill_items")
    .select("product_name, quantity, unit, purchase_price, total_price, created_at, markets(name), bills(bill_number, bill_date, scanned_by_name, supplier_name)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const header = "Item,Qty,Unit,Unit Price,Total,Market,Bill No,Date,Scanned By,Supplier\n";
  const rows = (items ?? []).map((i) => {
    const b = i.bills as { bill_number?: string; bill_date?: string; scanned_by_name?: string; supplier_name?: string } | null;
    const m = i.markets as { name?: string } | { name?: string }[] | null;
    const marketName = Array.isArray(m) ? m[0]?.name : m?.name;
    return [
      `"${i.product_name}"`,
      i.quantity,
      i.unit,
      i.purchase_price,
      i.total_price,
      `"${marketName ?? ""}"`,
      `"${b?.bill_number ?? ""}"`,
      b?.bill_date ?? "",
      `"${b?.scanned_by_name ?? ""}"`,
      `"${b?.supplier_name ?? ""}"`,
    ].join(",");
  });

  return header + rows.join("\n");
}
