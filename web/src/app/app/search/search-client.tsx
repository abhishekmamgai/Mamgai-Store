"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { searchItems, getItemPriceHistory } from "@/lib/actions/search";
import type { Market } from "@/lib/types";
import { Search, TrendingDown, TrendingUp, BarChart3, Loader2 } from "lucide-react";

type Props = {
  markets: Market[];
  categories: string[];
};

export function SearchClient({ markets, categories }: Props) {
  const [query, setQuery] = useState("");
  const [marketId, setMarketId] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"date_desc" | "name" | "price_asc" | "price_desc">("date_desc");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchItems>> | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getItemPriceHistory>> | null>(null);
  const [pending, startTransition] = useTransition();

  const doSearch = useCallback(
    (p = page) => {
      startTransition(async () => {
        const res = await searchItems({ query, market_id: marketId || undefined, category: category || undefined, sort, page: p, limit: 15 });
        setResults(res);
      });
    },
    [query, marketId, category, sort, page]
  );

  useEffect(() => {
    doSearch(1);
    setPage(1);
  }, [query, marketId, category, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHistory = (itemName: string) => {
    setSelectedItem(itemName);
    startTransition(async () => {
      const h = await getItemPriceHistory(itemName);
      setHistory(h);
    });
  };

  function relName(m: unknown): string {
    if (!m) return "—";
    if (Array.isArray(m)) return (m[0] as { name?: string })?.name ?? "—";
    return (m as { name?: string }).name ?? "—";
  }

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search item name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Market</Label>
            <select className="h-8 w-full rounded-lg border bg-background px-2 text-sm" value={marketId} onChange={(e) => setMarketId(e.target.value)}>
              <option value="">All markets</option>
              {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <select className="h-8 w-full rounded-lg border bg-background px-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sort</Label>
            <select className="h-8 w-full rounded-lg border bg-background px-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="date_desc">Latest first</option>
              <option value="name">Name A-Z</option>
              <option value="price_asc">Price low-high</option>
              <option value="price_desc">Price high-low</option>
            </select>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Search Results</h2>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {results && <span className="text-xs text-muted-foreground">{results.total} items</span>}
          </div>
          <div className="space-y-2 max-h-[28rem] overflow-y-auto">
            {(results?.items ?? []).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => loadHistory(item.product_name)}
                className={[
                  "w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent",
                  selectedItem === item.product_name ? "border-primary bg-primary/5" : "",
                ].join(" ")}
              >
                <div className="font-medium">{item.product_name}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>₹{Number(item.purchase_price)}/{item.unit}</span>
                  <span>{relName(item.markets)}</span>
                  <span>{(item.bills as { bill_date?: string } | null)?.bill_date}</span>
                </div>
              </button>
            ))}
            {!results?.items.length && !pending && (
              <p className="py-8 text-center text-sm text-muted-foreground">No items found</p>
            )}
          </div>
          {results && results.totalPages > 1 && (
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => { setPage((p) => p - 1); doSearch(page - 1); }}>Prev</Button>
              <span className="text-sm self-center">{page}/{results.totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= results.totalPages} onClick={() => { setPage((p) => p + 1); doSearch(page + 1); }}>Next</Button>
            </div>
          )}
        </GlassCard>

        <GlassCard>
          {history ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">{history.itemName}</h2>
                <Badge className="mt-1">{history.stats.count} purchases</Badge>
              </div>

              <div className="rounded-xl border bg-primary/5 p-4">
                <div className="text-xs text-muted-foreground">Latest Purchase</div>
                <div className="mt-1 text-2xl font-bold">₹{history.stats.latest}/{history.stats.latestUnit}</div>
                <div className="mt-2 grid gap-1 text-sm">
                  <div>Market: <strong>{history.stats.latestMarket}</strong></div>
                  <div>By: <strong>{history.stats.latestScannedBy}</strong></div>
                  <div>Date: <strong>{history.stats.latestDate}</strong></div>
                  <div>Bill #: <strong>{history.stats.latestBillNumber}</strong></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat icon={TrendingDown} label="Lowest" value={`₹${history.stats.lowest.toFixed(2)}`} />
                <Stat icon={TrendingUp} label="Highest" value={`₹${history.stats.highest.toFixed(2)}`} />
                <Stat icon={BarChart3} label="Average" value={`₹${history.stats.average.toFixed(2)}`} />
                <Stat icon={Search} label="Count" value={String(history.stats.count)} />
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Previous Purchases</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {history.purchases.slice(1).map((p, i) => (
                    <div key={i} className="flex justify-between text-sm border-b pb-1">
                      <span>₹{p.price}/{p.unit} — {p.market}</span>
                      <span className="text-muted-foreground">{p.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Select an item to view price history
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}
