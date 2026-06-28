"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass-card";
import { exportBillsCSV } from "@/lib/actions/bills";
import { exportBackupJSON, updateUserProfile, updateUserRole } from "@/lib/actions/admin";
import { addMarket, deleteMarket } from "@/lib/actions/markets";
import { Download, Database, Users, Store } from "lucide-react";
import type { Market } from "@/lib/types";

type User = { id: string; role: string; full_name: string | null; created_at: string };
type Bill = {
  id: string;
  bill_number: string | null;
  bill_date: string;
  grand_total: number | null;
  total_amount: number;
  scanned_by_name: string | null;
  created_at: string;
  markets: unknown;
};

type Props = {
  markets: Market[];
  users: User[];
  bills: Bill[];
  isOwner: boolean;
  currentUserId: string;
};

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminClient({ markets, users, bills, isOwner, currentUserId }: Props) {
  const [pending, startTransition] = useTransition();
  const [newMarket, setNewMarket] = useState("");

  const exportCSV = () => {
    startTransition(async () => {
      const csv = await exportBillsCSV();
      downloadFile(csv, `bills-export-${Date.now()}.csv`, "text/csv");
    });
  };

  const exportBackup = () => {
    startTransition(async () => {
      const json = await exportBackupJSON();
      downloadFile(json, `backup-${Date.now()}.json`, "application/json");
    });
  };

  function marketName(m: unknown) {
    if (!m) return "—";
    if (Array.isArray(m)) return (m[0] as { name?: string })?.name ?? "—";
    return (m as { name?: string }).name ?? "—";
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="flex items-center gap-3">
          <Store className="h-5 w-5 text-primary" />
          <div><div className="text-xs text-muted-foreground">Markets</div><div className="text-xl font-bold">{markets.length}</div></div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <div><div className="text-xs text-muted-foreground">Users</div><div className="text-xl font-bold">{users.length}</div></div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3">
          <Database className="h-5 w-5 text-primary" />
          <div><div className="text-xs text-muted-foreground">Bills</div><div className="text-xl font-bold">{bills.length}</div></div>
        </GlassCard>
        <GlassCard className="flex gap-2">
          <Button className="flex-1" variant="secondary" onClick={exportCSV} disabled={pending}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button className="flex-1" onClick={exportBackup} disabled={pending}>
            <Download className="h-4 w-4" /> Backup
          </Button>
        </GlassCard>
      </div>

      {/* Markets */}
      <GlassCard className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Store className="h-4 w-4" /> Manage Markets</h2>
        <div className="flex gap-2">
          <Input placeholder="New market name" value={newMarket} onChange={(e) => setNewMarket(e.target.value)} />
          <form action={addMarket} onSubmit={() => setNewMarket("")}>
            <input type="hidden" name="name" value={newMarket} />
            <Button type="submit" disabled={!newMarket.trim()}>Add</Button>
          </form>
        </div>
        <div className="divide-y">
          {markets.map((m) => (
            <div key={m.id} className="flex justify-between py-2 text-sm">
              <span>{m.name}</span>
              <form action={deleteMarket}>
                <input type="hidden" name="id" value={m.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">Delete</Button>
              </form>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Users */}
      <GlassCard className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Users</h2>
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm">
            <div>
              <div className="font-medium">{u.full_name ?? u.id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground capitalize">{u.role}</div>
            </div>
            {isOwner && u.id !== currentUserId && (
              <form action={updateUserRole} className="flex gap-2">
                <input type="hidden" name="id" value={u.id} />
                <select name="role" defaultValue={u.role} className="h-8 rounded border bg-background px-2 text-xs">
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>
                <Button type="submit" size="sm" variant="secondary">Update</Button>
              </form>
            )}
          </div>
        ))}
        <form action={updateUserProfile} className="flex gap-2 pt-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Your display name (used as scanner name)</Label>
            <Input name="full_name" placeholder="Abhishek" defaultValue={users.find((u) => u.id === currentUserId)?.full_name ?? ""} />
          </div>
          <div className="flex items-end"><Button type="submit" variant="secondary">Save</Button></div>
        </form>
      </GlassCard>

      {/* All Bills */}
      <GlassCard>
        <h2 className="font-semibold mb-3">All Bills</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b"><tr>
              <th className="p-2 text-left">Bill #</th>
              <th className="p-2 text-left">Market</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Scanned By</th>
              <th className="p-2 text-right">Total</th>
            </tr></thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="p-2">{b.bill_number ?? b.id.slice(0, 8)}</td>
                  <td className="p-2">{marketName(b.markets)}</td>
                  <td className="p-2">{b.bill_date}</td>
                  <td className="p-2">{b.scanned_by_name ?? "—"}</td>
                  <td className="p-2 text-right">₹{Number(b.grand_total ?? b.total_amount).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
