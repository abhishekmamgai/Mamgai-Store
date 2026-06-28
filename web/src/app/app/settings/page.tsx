import Link from "next/link";
import { Card } from "@/components/ui/card";
import { checkDatabaseReady } from "@/lib/actions/misc";
import { LanguageSettings } from "./language-settings";

export default async function SettingsPage() {
  const ready = await checkDatabaseReady().catch(() => false);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card className="p-5 space-y-4">
        <LanguageSettings />
        <div className="border-t border-border pt-4 text-sm">
          Database: <strong>{ready ? "Connected ✓" : "Not setup ✗"}</strong>
        </div>
        {!ready && (
          <Link href="/app/setup" className="inline-block text-primary underline text-sm">
            Run database setup →
          </Link>
        )}
        <Link href="/app/markets" className="block text-sm underline">
          Manage wholesale markets →
        </Link>
      </Card>
    </div>
  );
}
