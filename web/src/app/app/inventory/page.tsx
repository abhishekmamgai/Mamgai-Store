import { getProducts, getLowStockProducts } from "@/lib/actions/products";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function InventoryPage() {
  let products = [];
  let lowStock = [];
  let error = "";
  try {
    [products, lowStock] = await Promise.all([getProducts(), getLowStockProducts()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <Card className="mt-4 p-5 text-sm">{error}. <Link href="/app/setup" className="underline">Setup</Link></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      {lowStock.length > 0 && (
        <Card className="border-destructive/40 p-4">
          <div className="font-medium text-destructive">{lowStock.length} items low on stock</div>
        </Card>
      )}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-left">Market</th>
              <th className="p-3 text-right">Stock</th>
              <th className="p-3 text-right">Threshold</th>
              <th className="p-3 text-left">Last Purchase</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-muted-foreground">{(p.markets as { name: string } | null)?.name ?? "—"}</td>
                <td className={`p-3 text-right ${Number(p.stock_qty) <= Number(p.low_stock_threshold) ? "text-destructive font-medium" : ""}`}>
                  {p.stock_qty} {p.stock_unit}
                </td>
                <td className="p-3 text-right">{p.low_stock_threshold}</td>
                <td className="p-3">{p.last_purchase_date ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
