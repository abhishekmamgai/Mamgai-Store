"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { DictionaryKey } from "@/i18n/dictionaries";
import {
  BarChart3,
  Box,
  ClipboardList,
  FileText,
  LayoutDashboard,
  NotebookPen,
  Receipt,
  Search,
  Settings,
  Shield,
  ShoppingBasket,
  Store,
  Truck,
  UserCog,
} from "lucide-react";

const items: { href: string; labelKey: DictionaryKey; icon: React.ElementType }[] = [
  { href: "/app/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/app/bill-scan", labelKey: "billScanner", icon: Receipt },
  { href: "/app/search", labelKey: "itemSearch", icon: Search },
  { href: "/app/markets", labelKey: "markets", icon: Store },
  { href: "/app/products", labelKey: "products", icon: Box },
  { href: "/app/suppliers", labelKey: "suppliers", icon: Truck },
  { href: "/app/inventory", labelKey: "inventory", icon: ShoppingBasket },
  { href: "/app/daily-sales", labelKey: "dailySales", icon: BarChart3 },
  { href: "/app/purchase-plan", labelKey: "tomorrowPlan", icon: ClipboardList },
  { href: "/app/milk", labelKey: "milkPlanner", icon: FileText },
  { href: "/app/notes", labelKey: "dailyNotes", icon: NotebookPen },
  { href: "/app/reports", labelKey: "reports", icon: FileText },
  { href: "/app/admin", labelKey: "admin", icon: UserCog },
  { href: "/app/audit", labelKey: "auditTrail", icon: Shield },
  { href: "/app/settings", labelKey: "settings", icon: Settings },
];

export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {t(it.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

