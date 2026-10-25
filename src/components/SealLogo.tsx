import { motion } from "framer-motion";
import { Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";

export function SealLogo({ size = 36, stamp = false, className }: { size?: number; stamp?: boolean; className?: string }) {
  const seal = (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn("text-gold", className)} aria-hidden>
      <path
        fill="currentColor"
        d="M50 4l7 6 9-2 4 8 9 2 0 9 7 6-4 8 4 8-7 6 0 9-9 2-4 8-9-2-7 6-7-6-9 2-4-8-9-2 0-9-7-6 4-8-4-8 7-6 0-9 9-2 4-8 9 2z"
      />
      <circle cx="50" cy="50" r="30" fill="none" stroke="var(--gold-foreground)" strokeOpacity=".35" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="25" fill="none" stroke="var(--gold-foreground)" strokeOpacity=".2" strokeWidth="1" strokeDasharray="2 3" />
      <foreignObject x="28" y="28" width="44" height="44">
        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--gold-foreground)" }}>
          <Fingerprint style={{ width: "70%", height: "70%", opacity: 0.8 }} strokeWidth={1.6} />
        </div>
      </foreignObject>
    </svg>
  );
  if (!stamp) return seal;
  return (
    <motion.div
      initial={{ scale: 2.4, opacity: 0, rotate: -25 }}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={{ type: "spring", stiffness: 260, damping: 14 }}
      className="inline-block"
    >
      {seal}
    </motion.div>
  );
}
