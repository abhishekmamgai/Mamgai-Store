import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sendResetPasswordEmail } from "../actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error ? decodeURIComponent(sp.error) : "";

  return (
    <Card className="p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we’ll send a reset link.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form action={sendResetPasswordEmail} className="mt-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@store.com" required />
        </div>
        <Button type="submit" className="w-full">
          Send reset link
        </Button>
      </form>

      <div className="mt-4 text-sm">
        <Link className="font-medium hover:underline" href="/login">
          Back to login
        </Link>
      </div>
    </Card>
  );
}

