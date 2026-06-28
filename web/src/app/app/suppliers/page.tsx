import { getSuppliers, addSupplier } from "@/lib/actions/misc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function SuppliersPage() {
  let suppliers = [];
  let error = "";
  try {
    suppliers = await getSuppliers();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <Card className="mt-4 p-5 text-sm">{error}. <Link href="/app/setup" className="underline">Setup</Link></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Suppliers</h1>
      <Card className="p-5">
        <form action={addSupplier} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label>Name</Label><Input name="name" required /></div>
          <div className="space-y-1"><Label>Phone</Label><Input name="phone" /></div>
          <div className="space-y-1"><Label>Address</Label><Input name="address" /></div>
          <div className="space-y-1"><Label>GST</Label><Input name="gst_number" /></div>
          <Button type="submit">Add Supplier</Button>
        </form>
      </Card>
      <Card className="divide-y">
        {suppliers.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No suppliers yet</p>
        ) : (
          suppliers.map((s) => (
            <div key={s.id} className="flex justify-between p-4 text-sm">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-muted-foreground">{s.phone} {s.address && `• ${s.address}`}</div>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
