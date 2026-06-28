import { getMilkEntry, saveMilkEntry } from "@/lib/actions/misc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function MilkPlannerPage() {
  const today = new Date().toISOString().slice(0, 10);
  let entry = null;
  let error = "";
  try { entry = await getMilkEntry(today); } catch (e) { error = e instanceof Error ? e.message : "Error"; }

  if (error) {
    return <div><h1 className="text-2xl font-semibold">Milk Planner</h1><Card className="mt-4 p-5 text-sm">{error}. <Link href="/app/setup" className="underline">Setup</Link></Card></div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Milk Planner</h1>
      <Card className="p-5">
        <form action={saveMilkEntry} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="entry_date" value={today} />
          <div className="space-y-1"><Label>Today&apos;s Milk (liters/packets)</Label><Input name="today_milk" type="number" step="0.01" defaultValue={entry?.today_milk ?? 0} /></div>
          <div className="space-y-1"><Label>Tomorrow Requirement</Label><Input name="tomorrow_requirement" type="number" step="0.01" defaultValue={entry?.tomorrow_requirement ?? 0} /></div>
          <div className="space-y-1"><Label>Remaining Stock</Label><Input name="remaining_stock" type="number" step="0.01" defaultValue={entry?.remaining_stock ?? 0} /></div>
          <div className="space-y-1"><Label>Notes</Label><Input name="notes" defaultValue={entry?.notes ?? ""} /></div>
          <Button type="submit">Save</Button>
        </form>
      </Card>
    </div>
  );
}
