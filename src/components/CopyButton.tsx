import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, label = "Copier" }: { value: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 no-print" aria-label={label}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setOk(true); toast.success("Copié dans le presse-papiers");
        setTimeout(() => setOk(false), 1500);
      }}
    >
      {ok ? <Check className="h-3.5 w-3.5 text-valid" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}
