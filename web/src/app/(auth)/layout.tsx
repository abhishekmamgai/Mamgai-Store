import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Smart Store
          </Link>
          <div className="mt-1 text-sm text-muted-foreground">
            AI-Powered ERP for Kirana stores
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

