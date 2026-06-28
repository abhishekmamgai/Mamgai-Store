import { getPurchasePlan, addPurchasePlanItem, updatePurchasePlanStatus } from "@/lib/actions/misc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function PurchasePlanPage() {
  let items = [];
  let error = "";
  try { items = await getPurchasePlan(); } catch (e) { error = e instanceof Error ? e.message : "Error"; }

  if (error) {
    return <div><h1 className="text-2xl font-semibold">Tomorrow Plan</h1><Card className="mt-4 p-5 text-sm">{error}. <Link href="/app/setup" className="underline">Setup</Link></Card></div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Tomorrow Planning</h1>
      <Card className="p-5">
        <form action={addPurchasePlanItem} className="flex flex-wrap gap-2">
          <div className="space-y-1"><Label>Item</Label><Input name="item_name" placeholder="Milk 25 packets" required /></div>
          <div className="space-y-1"><Label>Qty</Label><Input name="quantity" placeholder="25 packets" /></div>
          <div className="flex items-end"><Button type="submit">Add</Button></div>
        </form>
      </Card>
      <Card className="divide-y">
        {items.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Nothing planned for tomorrow</p> : items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{item.item_name}</div>
              <div className="text-sm text-muted-foreground">{item.quantity}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={item.status === "purchased" ? "default" : "secondary"}>{item.status}</Badge>
              {item.status === "pending" && (
                <>
                  <form action={updatePurchasePlanStatus}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value="purchased" /><Button type="submit" size="sm" variant="secondary">Done</Button></form>
                  <form action={updatePurchasePlanStatus}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value="cancelled" /><Button type="submit" size="sm" variant="ghost">Cancel</Button></form>
                </>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
