import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background">
      <main className="w-full max-w-5xl px-6 py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Smart Store</span>
            <span className="hidden sm:inline">AI-Powered ERP for Kirana stores</span>
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Run your store on autopilot.
          </h1>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Scan supplier bills, track inventory, manage suppliers, record daily sales, and get smart alerts—everything in one dashboard.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
            >
              Login
            </Link>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "w-full sm:w-auto"
              )}
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-5">
            <div className="text-sm font-medium">AI Bill Scanner</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Upload or capture supplier bills—OCR + AI extracts items, quantities, and prices.
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-sm font-medium">Price Change Alerts</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Get notified when suppliers increase prices, with history preserved.
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-sm font-medium">Daily Sales & Reports</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Track Cash/UPI/Credit + expenses and export PDF/CSV reports.
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
