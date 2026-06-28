import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 bg-card/60 p-5 shadow-xl backdrop-blur-xl",
        "transition-all duration-300 hover:shadow-2xl dark:border-white/10 dark:bg-card/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
