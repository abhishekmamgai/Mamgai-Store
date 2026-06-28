import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signIn } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error ? decodeURIComponent(sp.error) : "";
  const message = sp.message ? decodeURIComponent(sp.message) : "";
  const next = sp.next ?? "";

  return (
    <Card className="p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="text-sm text-muted-foreground">
          Use your email and password to access your dashboard.
        </p>
      </div>

      {(error || message) && (
        <div
          className={[
            "mt-4 rounded-md border px-3 py-2 text-sm",
            error ? "border-destructive/40 text-destructive" : "border-border text-foreground",
          ].join(" ")}
        >
          {error || message}
        </div>
      )}

      <form action={signIn} className="mt-5 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@store.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link className="text-muted-foreground hover:text-foreground" href="/forgot-password">
          Forgot password?
        </Link>
        <Link className="font-medium hover:underline" href="/register">
          Create account
        </Link>
      </div>
    </Card>
  );
}

