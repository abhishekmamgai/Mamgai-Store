"use server";

import { requireStoreId } from "@/lib/auth/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SearchFilters = {
  query?: string;
  market_id?: string;
  category?: string;
  sort?: "name" | "price_asc" | "price_desc" | "date_desc";
  page?: number;
  limit?: number;
};

function relName(m: unknown): string {
  if (!m) return "";
  if (Array.isArray(m)) return (m[0] as { name?: string })?.name ?? "";
  return (m as { name?: string }).name ?? "";
}

export async function searchItems(filters: SearchFilters = {}) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const from = (page - 1) * limit;

  let q = supabase
    .from("bill_items")
    .select(
      "id, product_name, quantity, unit, purchase_price, total_price, category, created_at, market_id, markets(name), bills(bill_number, bill_date, scanned_by_name, supplier_name)",
      { count: "exact" }
    )
    .eq("store_id", storeId);

  if (filters.query?.trim()) {
    q = q.ilike("product_name", `%${filters.query.trim()}%`);
  }
  if (filters.market_id) {
    q = q.eq("market_id", filters.market_id);
  }
  if (filters.category?.trim()) {
    q = q.ilike("category", `%${filters.category.trim()}%`);
  }

  const sort = filters.sort ?? "date_desc";
  if (sort === "name") q = q.order("product_name");
  else if (sort === "price_asc") q = q.order("purchase_price", { ascending: true });
  else if (sort === "price_desc") q = q.order("purchase_price", { ascending: false });
  else q = q.order("created_at", { ascending: false });

  const { data, error, count } = await q.range(from, from + limit - 1);
  if (error) throw new Error(error.message);

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function getItemPriceHistory(itemName: string) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("bill_items")
    .select(
      "product_name, quantity, unit, purchase_price, total_price, created_at, markets(name), bills(bill_number, bill_date, scanned_by_name)"
    )
    .eq("store_id", storeId)
    .ilike("product_name", itemName.trim())
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const purchases = (data ?? []).map((p) => ({
    price: Number(p.purchase_price),
    unit: p.unit,
    quantity: Number(p.quantity),
    market: relName(p.markets),
    scannedBy: (p.bills as { scanned_by_name?: string } | null)?.scanned_by_name ?? "—",
    billNumber: (p.bills as { bill_number?: string } | null)?.bill_number ?? "—",
    date: (p.bills as { bill_date?: string } | null)?.bill_date ?? p.created_at.slice(0, 10),
    createdAt: p.created_at,
  }));

  const prices = purchases.map((p) => p.price).filter((p) => p > 0);

  return {
    itemName: itemName.trim(),
    purchases,
    stats: {
      count: purchases.length,
      lowest: prices.length ? Math.min(...prices) : 0,
      highest: prices.length ? Math.max(...prices) : 0,
      average: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      latest: prices[0] ?? 0,
      latestUnit: purchases[0]?.unit ?? "piece",
      latestMarket: purchases[0]?.market ?? "—",
      latestScannedBy: purchases[0]?.scannedBy ?? "—",
      latestDate: purchases[0]?.date ?? "—",
      latestBillNumber: purchases[0]?.billNumber ?? "—",
    },
  };
}

export async function getDistinctItemNames(limit = 50) {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("bill_items")
    .select("product_name")
    .eq("store_id", storeId)
    .order("product_name")
    .limit(500);

  if (error) throw new Error(error.message);

  const unique = [...new Set((data ?? []).map((d) => d.product_name))].slice(0, limit);
  return unique;
}

export async function getCategories() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("bill_items")
    .select("category")
    .eq("store_id", storeId)
    .not("category", "is", null);

  return [...new Set((data ?? []).map((d) => d.category).filter(Boolean))] as string[];
}
