import { getProducts } from "@/lib/actions/products";
import { getMarkets } from "@/lib/actions/markets";
import { addProduct } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { STOCK_UNITS } from "@/lib/types";
import Link from "next/link";

export default async function ProductsPage() {
  let products = [];
  let markets = [];
  let error = "";

  try {
    [products, markets] = await Promise.all([getProducts(), getMarkets()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error loading products";
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Products</h1>
        <Card className="mt-4 p-5 text-sm">
          {error}. <Link href="/app/setup" className="underline">Setup database</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm text-muted-foreground">Catalog with market-wise purchase tracking</p>
      </div>

      <Card className="p-5">
        <h2 className="font-medium">Add Product</h2>
        <form action={addProduct} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input name="name" required placeholder="Product name" />
          </div>
          <div className="space-y-1">
            <Label>Market</Label>
            <select name="market_id" className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
              <option value="">—</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Purchase ₹</Label>
            <Input name="purchase_price" type="number" step="0.01" defaultValue={0} />
          </div>
          <div className="space-y-1">
            <Label>Selling ₹</Label>
            <Input name="selling_price" type="number" step="0.01" defaultValue={0} />
          </div>
          <div className="space-y-1">
            <Label>Stock</Label>
            <Input name="stock_qty" type="number" step="0.001" defaultValue={0} />
          </div>
          <div className="space-y-1">
            <Label>Unit</Label>
            <select name="stock_unit" className="h-8 w-full rounded-lg border bg-background px-2 text-sm">
              {STOCK_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit">Add Product</Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Market</th>
                <th className="p-3 text-right">Purchase</th>
                <th className="p-3 text-right">Selling</th>
                <th className="p-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No products — add via bill scan or manually</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-3">{p.name}</td>
                    <td className="p-3 text-muted-foreground">{(p.markets as { name: string } | null)?.name ?? "—"}</td>
                    <td className="p-3 text-right">₹{Number(p.purchase_price).toFixed(2)}</td>
                    <td className="p-3 text-right">₹{Number(p.selling_price).toFixed(2)}</td>
                    <td className="p-3 text-right">{p.stock_qty} {p.stock_unit}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
