import { getBillsByMarket, getRecentBills } from "@/lib/actions/bills";
import { getSalesHistory } from "@/lib/actions/daily-sales";
import { Card } from "@/components/ui/card";
import Link from "next/link";

function marketName(m: unknown): string {
  if (!m) return "Unknown";
  if (Array.isArray(m)) return (m[0] as { name?: string })?.name ?? "Unknown";
  return (m as { name?: string }).name ?? "Unknown";
}

export default async function ReportsPage() {
  let billItems: Awaited<ReturnType<typeof getBillsByMarket>> = [];
  let bills: Awaited<ReturnType<typeof getRecentBills>> = [];
  let sales: Awaited<ReturnType<typeof getSalesHistory>> = [];
  let error = "";

  try {
    [billItems, bills, sales] = await Promise.all([
      getBillsByMarket(),
      getRecentBills(20),
      getSalesHistory(30),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Card className="mt-4 p-5 text-sm">{error}. <Link href="/app/setup" className="underline">Setup</Link></Card>
      </div>
    );
  }

  // Group prices by product + market for comparison
  const comparison = new Map<string, { market: string; price: number; date: string }[]>();
  for (const item of billItems) {
    const key = item.product_name;
    const marketNameStr = marketName(item.markets);
    if (!comparison.has(key)) comparison.set(key, []);
    comparison.get(key)!.push({
      market: marketNameStr,
      price: Number(item.purchase_price),
      date: item.created_at.slice(0, 10),
    });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Reports</h1>

      <Card className="p-5">
        <h2 className="font-medium">Market Price Comparison</h2>
        <p className="text-sm text-muted-foreground">Kaun sa market sasta de raha hai — same product different markets</p>
        <div className="mt-4 space-y-3">
          {[...comparison.entries()].slice(0, 15).map(([product, entries]) => {
            const best = entries.reduce((a, b) => (a.price < b.price ? a : b));
            return (
              <div key={product} className="rounded border p-3 text-sm">
                <div className="font-medium">{product}</div>
                <div className="mt-1 text-green-700 dark:text-green-400">
                  Best: {best.market} @ ₹{best.price} ({best.date})
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-muted-foreground">
                  {entries.slice(0, 5).map((e, i) => (
                    <span key={i}>{e.market}: ₹{e.price}</span>
                  ))}
                </div>
              </div>
            );
          })}
          {comparison.size === 0 && <p className="text-muted-foreground">Scan bills with different markets to see comparison</p>}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-medium">Recent Bills</h2>
          <div className="mt-3 space-y-2">
            {bills.map((b) => (
              <div key={b.id} className="flex justify-between text-sm">
                <span>{marketName(b.markets)} • {b.bill_date}</span>
                <span>₹{Number(b.total_amount).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-medium">Sales History</h2>
          <div className="mt-3 space-y-2">
            {sales.map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span>{s.sale_date}</span>
                <span>₹{(Number(s.cash_sale) + Number(s.upi_sale)).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
