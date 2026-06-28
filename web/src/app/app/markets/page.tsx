import { getAllMarkets, addMarket, deleteMarket } from "@/lib/actions/markets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function MarketsPage() {
  let markets = [];
  let error = "";
  try {
    markets = await getAllMarkets();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Markets</h1>
        <Card className="mt-4 p-5 text-sm">{error}. <Link href="/app/setup" className="underline">Setup</Link></Card>
      </div>
    );
  }

  const active = markets.filter((m) => m.is_active);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Wholesale Markets</h1>
        <p className="text-sm text-muted-foreground">
          Mehrauli, Daryaganj, etc. — har bill market ke saath save hota hai for price comparison
        </p>
      </div>

      <Card className="p-5">
        <form action={addMarket} className="flex flex-wrap gap-2">
          <div className="space-y-1 flex-1 min-w-48">
            <Label>New market name</Label>
            <Input name="name" placeholder="e.g. Sadar Bazar" required />
          </div>
          <div className="flex items-end">
            <Button type="submit">Add Market</Button>
          </div>
        </form>
      </Card>

      <Card className="divide-y">
        {active.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No markets — add Mehrauli Market, Daryaganj Market, etc.</p>
        ) : (
          active.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4">
              <span className="font-medium">{m.name}</span>
              <form action={deleteMarket}>
                <input type="hidden" name="id" value={m.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                  Delete
                </Button>
              </form>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
