import { AlertTriangle, BadgeCheck, CircleHelp, Ban } from "lucide-react";
import type { UiStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const STATUS_META: Record<UiStatus, { label: string; icon: typeof BadgeCheck; cls: string; text: string }> = {
  valid: { label: "Valide", icon: BadgeCheck, cls: "text-valid bg-valid/10 border-valid/30", text: "Ce document est authentique et n'a pas été modifié depuis sa certification." },
  revoked: { label: "Révoqué", icon: Ban, cls: "text-revoked bg-revoked/10 border-revoked/30", text: "Ce document a été révoqué par son émetteur." },
  unknown: { label: "Inconnu", icon: CircleHelp, cls: "text-unknown bg-unknown/10 border-unknown/30", text: "Aucune certification ne correspond à ce fichier." },
  modified: { label: "Modifié", icon: AlertTriangle, cls: "text-modified bg-modified/10 border-modified/30", text: "Ce fichier ne correspond pas à l'original certifié : il a été modifié." },
};

export function StatusBadge({ status, className }: { status: UiStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", m.cls, className)}>
      <m.icon className="h-3.5 w-3.5" /> {m.label}
    </span>
  );
}

export function StatusBanner({ status, extra }: { status: UiStatus; extra?: string }) {
  const m = STATUS_META[status];
  return (
    <div className={cn("flex items-start gap-4 rounded-2xl border p-5", m.cls)} role="status">
      <m.icon className="h-10 w-10 shrink-0" />
      <div>
        <p className="font-serif text-2xl font-semibold">{m.label}</p>
        <p className="mt-1 text-sm text-foreground/80">{m.text}</p>
        {extra && <p className="mt-1 text-sm text-foreground/80">{extra}</p>}
      </div>
    </div>
  );
}
