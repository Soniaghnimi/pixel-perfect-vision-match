import { motion } from "framer-motion";
import { Link2 } from "lucide-react";
import { fmtDate, shortHash } from "@/lib/format";
import type { Doc } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export function VersionTimeline({ chain, currentId, selected, onSelect }: { chain: Doc[]; currentId?: number | undefined; selected?: number | undefined; onSelect: (d: Doc) => void }) {
  const inForce = [...chain].reverse().find((d) => !d.revoked)?.id;
  return (
    <ol className="space-y-0">
      {chain.map((d, i) => (
        <li key={d.id}>
          {i > 0 && (
            <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.15 }} className="ml-8 flex h-10 origin-top items-center">
              <div className="h-full w-px bg-gold" /><Link2 className="-ml-2 h-4 w-4 rotate-90 text-gold" />
            </motion.div>
          )}
          <motion.button
            type="button" onClick={() => onSelect(d)}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
            className={cn("flex w-full items-start gap-4 rounded-2xl border bg-card p-4 text-left shadow-soft transition hover:border-gold",
              selected === d.id && "border-gold ring-2 ring-gold/30", d.id === currentId && "bg-accent")}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary font-serif text-primary-foreground">V{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{d.title}</p>
                <StatusBadge status={d.revoked ? "revoked" : "valid"} />
                {d.id === inForce && <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-medium text-gold-foreground">Version en vigueur</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{fmtDate(d.timestamp)} · #{d.id} · <code className="font-mono">{shortHash(d.hash)}</code></p>
              {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
            </div>
          </motion.button>
        </li>
      ))}
    </ol>
  );
}
