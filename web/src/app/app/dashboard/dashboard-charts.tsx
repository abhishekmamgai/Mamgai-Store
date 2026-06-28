"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { GlassCard } from "@/components/glass-card";
import { Receipt, Package, Store, IndianRupee } from "lucide-react";

type Analytics = {
  cards: {
    totalBills: number;
    totalItems: number;
    totalMarkets: number;
    totalSpending: number;
  };
  monthlySpending: { month: string; amount: number }[];
  marketSpending: { name: string; value: number }[];
  topItems: { name: string; value: number }[];
  priceTrends: { product: string; month: string; avgPrice: number }[];
};

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function DashboardCharts({ data }: { data: Analytics }) {
  const trendByMonth = data.priceTrends.reduce(
    (acc, t) => {
      if (!acc[t.month]) acc[t.month] = { month: t.month, avg: 0, count: 0 };
      acc[t.month].avg += t.avgPrice;
      acc[t.month].count += 1;
      return acc;
    },
    {} as Record<string, { month: string; avg: number; count: number }>
  );
  const trendData = Object.values(trendByMonth).map((t) => ({
    month: t.month,
    avgPrice: t.count ? Math.round(t.avg / t.count) : 0,
  }));

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Receipt} label="Total Bills" value={String(data.cards.totalBills)} />
        <KpiCard icon={Package} label="Total Items" value={String(data.cards.totalItems)} />
        <KpiCard icon={Store} label="Markets" value={String(data.cards.totalMarkets)} />
        <KpiCard icon={IndianRupee} label="Total Spending" value={`₹${data.cards.totalSpending.toLocaleString("en-IN")}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="mb-4 font-semibold">Monthly Spending</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthlySpending}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Spent"]} />
              <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 font-semibold">Market-wise Spending</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.marketSpending} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                {data.marketSpending.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Spent"]} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 font-semibold">Top Items by Spending</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topItems} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Total"]} />
              <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 font-semibold">Price Trends (Avg)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`₹${Number(v).toFixed(2)}`, "Avg Price"]} />
              <Line type="monotone" dataKey="avgPrice" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <GlassCard className="flex items-center gap-4">
      <div className="rounded-xl bg-primary/10 p-3">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </GlassCard>
  );
}
