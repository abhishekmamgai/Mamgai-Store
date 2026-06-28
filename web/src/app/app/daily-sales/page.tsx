import { getDailySales, saveDailySales, getSalesHistory } from "@/lib/actions/daily-sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function DailySalesPage() {
  const today = new Date().toISOString().slice(0, 10);
  let sale = null;
  let history = [];
  let error = "";

  try {
    [sale, history] = await Promise.all([getDailySales(today), getSalesHistory(14)]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  const total = Number(sale?.cash_sale ?? 0) + Number(sale?.upi_sale ?? 0) + Number(sale?.credit_sale ?? 0);
  const net = Number(sale?.cash_sale ?? 0) + Number(sale?.upi_sale ?? 0) - Number(sale?.expenses ?? 0);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Daily Sales</h1>
        <Card className="mt-4 p-5 text-sm">{error}. <Link href="/app/setup" className="underline">Setup</Link></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Daily Sales</h1>
        <p className="text-sm text-muted-foreground">Cash, UPI, Credit + expenses — saves to database</p>
      </div>

      <Card className="p-5">
        <form action={saveDailySales} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="sale_date" value={today} />
          <div className="space-y-1">
            <Label>Cash Sale ₹</Label>
            <Input name="cash_sale" type="number" step="0.01" defaultValue={sale?.cash_sale ?? 0} />
          </div>
          <div className="space-y-1">
            <Label>UPI Sale ₹</Label>
            <Input name="upi_sale" type="number" step="0.01" defaultValue={sale?.upi_sale ?? 0} />
          </div>
          <div className="space-y-1">
            <Label>Credit Sale ₹</Label>
            <Input name="credit_sale" type="number" step="0.01" defaultValue={sale?.credit_sale ?? 0} />
          </div>
          <div className="space-y-1">
            <Label>Expenses ₹</Label>
            <Input name="expenses" type="number" step="0.01" defaultValue={sale?.expenses ?? 0} />
          </div>
          <div className="space-y-1">
            <Label>Opening Cash ₹</Label>
            <Input name="opening_cash" type="number" step="0.01" defaultValue={sale?.opening_cash ?? 0} />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input name="notes" defaultValue={sale?.notes ?? ""} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-4">
            <Button type="submit">Save Today&apos;s Sales</Button>
            <div className="text-sm text-muted-foreground">
              Total: <strong>₹{total.toFixed(0)}</strong> • Net: <strong>₹{net.toFixed(0)}</strong>
            </div>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-medium">History</h2>
        <div className="mt-3 space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex justify-between text-sm border-b pb-2">
              <span>{h.sale_date}</span>
              <span>₹{(Number(h.cash_sale) + Number(h.upi_sale) + Number(h.credit_sale)).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
