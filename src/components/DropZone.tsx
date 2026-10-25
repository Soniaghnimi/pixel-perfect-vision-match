import { useRef, useState } from "react";
import { FileText, FileImage, File as FileIcon, UploadCloud, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { fmtSize } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DropZone({ file, onFile }: { file?: File | undefined; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const take = (f?: File) => {
    if (!f) return;
    if (f.size === 0) { toast.error("Ce fichier est vide."); return; }
    onFile(f);
  };
  const Icon = !file ? UploadCloud : file.type.startsWith("image/") ? FileImage : /pdf|word|text/.test(file.type) ? FileText : FileIcon;
  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card px-6 py-12 text-center transition-colors",
          over ? "border-gold bg-accent" : "hover:border-gold/60",
        )}
      >
        <Icon className={cn("h-12 w-12", file ? "text-primary" : "text-muted-foreground")} strokeWidth={1.3} />
        {file ? (
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{fmtSize(file.size)} · cliquez pour changer</p>
          </div>
        ) : (
          <div>
            <p className="font-medium">Glissez-déposez votre fichier ici</p>
            <p className="text-sm text-muted-foreground">ou cliquez pour parcourir — PDF, image, Word…</p>
          </div>
        )}
      </button>
      <input ref={input} type="file" className="sr-only" aria-label="Choisir un fichier" onChange={(e) => take(e.target.files?.[0])} />
      <p className="mt-3 flex items-center gap-2 text-sm text-valid">
        <ShieldCheck className="h-4 w-4" /> Votre document ne quitte jamais votre appareil.
      </p>
    </div>
  );
}
