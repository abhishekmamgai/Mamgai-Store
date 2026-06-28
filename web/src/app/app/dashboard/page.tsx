import Link from "next/link";
import { getDashboardAnalytics } from "@/lib/actions/analytics";
import { checkDatabaseReady } from "@/lib/actions/misc";
import { DashboardCharts } from "./dashboard-charts";
import { GlassCard } from "@/components/glass-card";

export default async function DashboardPage() {
  const ready = await checkDatabaseReady().catch(() => false);

  if (!ready) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <GlassCard>
          <p className="text-sm">Database setup pending.</p>
          <Link href="/app/setup" className="mt-2 inline-block text-primary underline">Setup database →</Link>
        </GlassCard>
      </div>
    );
  }

  const analytics = await getDashboardAnalytics().catch(() => null);

  if (!analytics) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <GlassCard className="mt-4"><p className="text-sm text-muted-foreground">Could not load analytics</p></GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground">Bills, spending, markets & price trends</p>
      </div>
      <DashboardCharts data={analytics} />
    </div>
  );
}
