import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, ExternalLink, Link2, Printer, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useContract } from "@/hooks/web3";
import { downloadFile, explorerTx, fmtDate, shortHash } from "@/lib/format";
import type { Doc, UiStatus } from "@/lib/types";
import { CopyButton } from "./CopyButton";
import { SealLogo } from "./SealLogo";
import { StatusBadge } from "./StatusBadge";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-dashed py-2.5 last:border-0 sm:grid-cols-[170px_1fr] sm:gap-4">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

export function ProofCard({ doc, status, stamp = false }: { doc: Doc; status?: UiStatus; stamp?: boolean }) {
  const api = useContract();
  const [tx, setTx] = useState<string>();
  useEffect(() => { api.txHash(doc.id).then(setTx).catch(() => {}); }, [api, doc.id]);
  const st: UiStatus = status ?? (doc.revoked ? "revoked" : "valid");
  const link = typeof window !== "undefined" ? `${window.location.origin}/verifier?id=${doc.id}` : "";
  const txUrl = explorerTx(tx);
  const inChain = !!doc.previousId || !!doc.nextId;

  return (
    <article className="certificate relative rounded-2xl bg-card p-6 sm:p-8">
      <div className="absolute right-5 top-5"><SealLogo size={72} stamp={stamp} /></div>
      <p className="text-xs uppercase tracking-[0.25em] text-gold">Preuve de certification</p>
      <h3 className="mt-2 pr-24 text-2xl font-semibold">{doc.title}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <StatusBadge status={st} />
        <span className="rounded-full bg-muted px-2.5 py-0.5">{doc.docType}</span>
        <span className="rounded-full bg-muted px-2.5 py-0.5">{doc.category}</span>
        {doc.version && <span className="rounded-full bg-muted px-2.5 py-0.5">V{doc.version}</span>}
      </div>
      <dl className="mt-5">
        {doc.description && <Row label="Description">{doc.description}</Row>}
        <Row label="Empreinte SHA-256">
          <span className="flex items-center gap-1"><code className="font-mono text-xs break-all">{doc.hash}</code><CopyButton value={doc.hash} /></span>
        </Row>
        <Row label="Émetteur">
          <span className="flex items-center gap-1"><code className="font-mono text-xs break-all">{doc.issuer}</code><CopyButton value={doc.issuer} /></span>
        </Row>
        <Row label="Date du bloc">{fmtDate(doc.timestamp)}</Row>
        <Row label="Identifiant">#{doc.id}</Row>
        <Row label="Transaction">
          {tx ? (
            txUrl ? <a href={txUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs underline">{shortHash(tx)} <ExternalLink className="h-3 w-3" /></a>
                  : <code className="font-mono text-xs">{shortHash(tx)}</code>
          ) : <span className="text-muted-foreground">Recherche…</span>}
        </Row>
      </dl>
      <div className="no-print mt-6 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(link); toast.success("Lien de vérification copié"); }}>
          <Link2 /> Copier le lien de vérification
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadFile(`preuve-${doc.id}.json`, JSON.stringify({ ...doc, status: st, transaction: tx, verifyUrl: link }, null, 2), "application/json")}>
          <Download /> Télécharger la preuve (JSON)
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> Imprimer / PDF</Button>
        {inChain && (
          <Button asChild variant="ghost" size="sm"><Link to="/versions/$id" params={{ id: String(doc.id) }}><GitBranch /> Voir la chaîne des versions</Link></Button>
        )}
      </div>
    </article>
  );
}
