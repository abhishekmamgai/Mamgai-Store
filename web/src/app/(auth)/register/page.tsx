import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signUp } from "../actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error ? decodeURIComponent(sp.error) : "";

  return (
    <Card className="p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="text-sm text-muted-foreground">
          Start with email/password (you can add roles, staff, and security policies later).
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form action={signUp} className="mt-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="owner@store.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            placeholder="At least 8 characters"
          />
        </div>
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>

      <div className="mt-4 text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link className="font-medium hover:underline" href="/login">
          Login
        </Link>
      </div>
    </Card>
  );
}

