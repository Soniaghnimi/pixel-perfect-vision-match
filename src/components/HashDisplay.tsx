import { useEffect, useState } from "react";
import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";

/** Affiche une empreinte ; si `animate`, elle se construit caractère par caractère. */
export function HashDisplay({ hash, animate = false, highlightAgainst, className }: { hash: string; animate?: boolean; highlightAgainst?: string; className?: string }) {
  const [n, setN] = useState(animate ? 0 : hash.length);
  useEffect(() => {
    if (!animate) { setN(hash.length); return; }
    setN(0);
    const t = setInterval(() => setN((x) => (x >= hash.length ? (clearInterval(t), x) : x + 2)), 18);
    return () => clearInterval(t);
  }, [hash, animate]);
  const shown = hash.slice(0, n);
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border bg-muted/50 px-3 py-2", className)}>
      <code className="font-mono text-xs leading-relaxed break-all flex-1">
        {highlightAgainst
          ? [...shown].map((c, i) => (
              <span key={i} className={c !== highlightAgainst[i] ? "bg-modified/25 text-modified font-semibold rounded-sm" : ""}>{c}</span>
            ))
          : shown}
        {n < hash.length && <span className="animate-pulse text-gold">▍</span>}
      </code>
      <CopyButton value={hash} label="Copier l'empreinte" />
    </div>
  );
}
