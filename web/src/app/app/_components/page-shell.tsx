import { Card } from "@/components/ui/card";

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <Card className="p-5">{children ?? <EmptyState />}</Card>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
      Coming soon — UI wired, data integration next.
    </div>
  );
}

