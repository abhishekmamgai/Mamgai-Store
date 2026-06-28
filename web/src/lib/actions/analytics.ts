"use server";

import { requireStoreId } from "@/lib/auth/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function monthKey(date: string) {
  return date.slice(0, 7);
}

export async function getDashboardAnalytics() {
  const storeId = await requireStoreId();
  const supabase = await createSupabaseServerClient();

  const [billsRes, itemsRes, marketsRes, spendingRes] = await Promise.all([
    supabase.from("bills").select("id", { count: "exact", head: true }).eq("store_id", storeId),
    supabase.from("bill_items").select("id", { count: "exact", head: true }).eq("store_id", storeId),
    supabase.from("markets").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("is_active", true),
    supabase.from("bills").select("grand_total, total_amount, bill_date, market_id, markets(name)").eq("store_id", storeId),
  ]);

  const bills = spendingRes.data ?? [];
  const totalSpending = bills.reduce((s, b) => s + Number(b.grand_total ?? b.total_amount ?? 0), 0);

  const monthlyMap = new Map<string, number>();
  const marketMap = new Map<string, number>();
  const itemSpending = new Map<string, number>();

  for (const b of bills) {
    const amt = Number(b.grand_total ?? b.total_amount ?? 0);
    const mk = monthKey(b.bill_date);
    monthlyMap.set(mk, (monthlyMap.get(mk) ?? 0) + amt);
    const mName = Array.isArray(b.markets)
      ? (b.markets[0] as { name?: string })?.name
      : (b.markets as { name?: string } | null)?.name;
    if (mName) marketMap.set(mName, (marketMap.get(mName) ?? 0) + amt);
  }

  const { data: allItems } = await supabase
    .from("bill_items")
    .select("product_name, total_price")
    .eq("store_id", storeId);

  for (const item of allItems ?? []) {
    itemSpending.set(item.product_name, (itemSpending.get(item.product_name) ?? 0) + Number(item.total_price));
  }

  const topItems = [...itemSpending.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const monthlySpending = [...monthlyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, amount]) => ({ month, amount }));

  const marketSpending = [...marketMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const { data: priceData } = await supabase
    .from("bill_items")
    .select("product_name, purchase_price, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true })
    .limit(200);

  const trendMap = new Map<string, { sum: number; count: number }>();
  for (const p of priceData ?? []) {
    const mk = monthKey(p.created_at);
    const key = `${p.product_name}|${mk}`;
    const cur = trendMap.get(key) ?? { sum: 0, count: 0 };
    cur.sum += Number(p.purchase_price);
    cur.count += 1;
    trendMap.set(key, cur);
  }

  const priceTrends = [...trendMap.entries()]
    .map(([key, v]) => {
      const [product, month] = key.split("|");
      return { product, month, avgPrice: v.sum / v.count };
    })
    .slice(-30);

  return {
    cards: {
      totalBills: billsRes.count ?? 0,
      totalItems: itemsRes.count ?? 0,
      totalMarkets: marketsRes.count ?? 0,
      totalSpending,
    },
    monthlySpending,
    marketSpending,
    topItems,
    priceTrends,
  };
}
