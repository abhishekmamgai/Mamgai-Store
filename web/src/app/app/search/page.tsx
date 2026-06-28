import { getMarkets } from "@/lib/actions/markets";
import { getCategories } from "@/lib/actions/search";
import { SearchClient } from "./search-client";
import Link from "next/link";

export default async function SearchPage() {
  let markets = [];
  let categories: string[] = [];
  let error = "";

  try {
    [markets, categories] = await Promise.all([getMarkets(), getCategories()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Item Search</h1>
        <p className="mt-2 text-sm">{error}. <Link href="/app/setup" className="underline">Setup database</Link></p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Item Search & Price History</h1>
        <p className="text-sm text-muted-foreground">Search by item, market, or category — view full price history</p>
      </div>
      <SearchClient markets={markets} categories={categories} />
    </div>
  );
}
