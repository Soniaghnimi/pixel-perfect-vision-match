import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({ label, value, icon: Icon, hint, tone = "text-primary" }: { label: string; value: number | string; icon: LucideIcon; hint?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label} <Icon className={cn("h-4 w-4", tone)} />
      </div>
      <p className="mt-2 font-serif text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
