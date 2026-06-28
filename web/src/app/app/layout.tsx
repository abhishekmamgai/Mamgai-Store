import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { AppNav } from "./nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Language } from "@/i18n/dictionaries";

async function getUserData(): Promise<{ email: string | null; language: Language }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { email: null, language: "en" };

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) return { email: null, language: "en" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .single();

  return { 
    email: user.email ?? null, 
    language: (profile?.language as Language) || "en" 
  };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { email, language } = await getUserData();

  return (
    <LanguageProvider initialLanguage={language}>
      <div className="flex min-h-dvh bg-gradient-to-br from-background via-background to-muted/30">
      <aside className="hidden w-64 flex-col border-r border-white/10 bg-card/50 backdrop-blur-xl px-4 py-4 md:flex">
        <Link href="/app/dashboard" className="px-2 py-1 text-sm font-semibold tracking-tight">
          Smart Store
        </Link>
        <div className="px-2 pb-2 text-xs text-muted-foreground">AI ERP</div>
        <Separator className="my-3" />
        <AppNav />
        <div className="mt-auto pt-4">
          <Separator className="mb-3" />
          {email && <div className="px-3 pb-3 text-xs text-muted-foreground">{email}</div>}
          <form action="/logout" method="post">
            <Button type="submit" variant="secondary" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-6">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open menu"
                />
              }
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>Smart Store</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <AppNav />
                <div className="mt-6">
                  <form action="/logout" method="post">
                    <Button type="submit" variant="secondary" className="w-full">
                      Sign out
                    </Button>
                  </form>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">Smart Store</div>
            <div className="truncate text-xs text-muted-foreground">
              Bill Scan • Price Tracker
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
    </LanguageProvider>
  );
}

