import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DropZone } from "@/components/DropZone";
import { HashDisplay } from "@/components/HashDisplay";
import { ProofCard } from "@/components/ProofCard";
import { StatusBanner } from "@/components/StatusBadge";
import { useContract, useDocuments } from "@/hooks/web3";
import { fmtDate, sha256 } from "@/lib/format";
import type { Doc, UiStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/verifier")({
  validateSearch: z.object({ id: z.coerce.number().optional() }),
  head: () => ({
    meta: [
      { title: "Vérifier un document — Sceau" },
      { name: "description", content: "Vérifiez qu'un document est authentique et n'a pas été modifié depuis sa certification." },
      { property: "og:title", content: "Vérifier un document — Sceau" },
      { property: "og:description", content: "Contrôlez l'authenticité d'un document certifié sur la blockchain." },
    ],
  }),
  component: Verify,
});

function Verify() {
  const { id } = Route.useSearch();
  const api = useContract();
  const [file, setFile] = useState<File>();
  const [hash, setHash] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<UiStatus>();
  const [doc, setDoc] = useState<Doc>();
  const [revokedAt, setRevokedAt] = useState<number>();
  const [ask, setAsk] = useState<"idle" | "no" | "yes">("idle");
  const [shared, setShared] = useState<Doc | null>();

  useEffect(() => {
    if (!id) { setShared(undefined); return; }
    setShared(undefined);
    api.getDoc(id).then((d) => setShared(d ?? null));
  }, [api, id]);

  useEffect(() => {
    const d = doc ?? shared ?? undefined;
    if (d?.revoked) api.revokedAt(d.id).then(setRevokedAt); else setRevokedAt(undefined);
  }, [api, doc, shared]);

  const onFile = async (f: File) => {
    setFile(f); setBusy(true); setStatus(undefined); setDoc(undefined); setAsk("idle");
    const h = await sha256(f); setHash(h);
    const v = await api.verify(h);
    setStatus(v.status === 1 ? "valid" : v.status === 2 ? "revoked" : "unknown");
    setDoc(v.doc); setBusy(false);
  };

  if (id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Preuve du document #{id}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vérification en lecture seule par lien partagé.</p>
        <div className="mt-6 space-y-6">
          {shared === undefined ? <Skeleton className="h-96 rounded-2xl" /> : shared === null ? (
            <StatusBanner status="unknown" />
          ) : (
            <>
              <StatusBanner status={shared.revoked ? "revoked" : "valid"} extra={revokedAt ? `Révoqué le ${fmtDate(revokedAt)}.` : undefined} />
              <ProofCard doc={shared} />
            </>
          )}
          <Button asChild variant="outline"><Link to="/verifier" search={{}}>Vérifier un fichier</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-semibold">Vérifier un document</h1>
      <p className="mt-2 text-muted-foreground">Déposez le fichier : son empreinte sera comparée à celles enregistrées sur la blockchain.</p>
      <div className="mt-8 space-y-6">
        <DropZone file={file} onFile={onFile} />
        {hash && <HashDisplay hash={hash} animate />}
        {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Interrogation du contrat…</p>}
        {status && status !== "unknown" && doc && (
          <>
            <StatusBanner status={status} extra={revokedAt ? `Révoqué le ${fmtDate(revokedAt)}.` : undefined} />
            <ProofCard doc={doc} status={status} />
          </>
        )}
        {status === "unknown" && hash && (
          <>
            <StatusBanner status="unknown" />
            {ask !== "yes" && (
              <div className="rounded-2xl border bg-card p-5">
                <p className="font-medium">Ce fichier est-il une version modifiée d'un document déjà certifié ?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant={ask === "no" ? "default" : "outline"} onClick={() => setAsk("no")}>Non, c'est un nouveau document</Button>
                  <Button variant="outline" onClick={() => setAsk("yes")}>Oui, c'est une modification</Button>
                </div>
                {ask === "no" && <p className="mt-3 text-sm text-muted-foreground">Vous pouvez le <Link to="/certifier" className="underline">certifier dès maintenant</Link>.</p>}
              </div>
            )}
            {ask === "yes" && <CompareOriginal hash={hash} />}
          </>
        )}
      </div>
    </div>
  );
}

function CompareOriginal({ hash }: { hash: string }) {
  const { docs } = useDocuments();
  const [q, setQ] = useState("");
  const [orig, setOrig] = useState<Doc>();
  const list = (docs ?? []).filter((d) => d.title.toLowerCase().includes(q.toLowerCase()) || String(d.id) === q);
  if (orig) {
    const same = orig.hash.toLowerCase() === hash.toLowerCase();
    return (
      <div className="space-y-6">
        <StatusBanner status={same ? "valid" : "modified"} />
        {!same && (
          <div className="grid gap-4 md:grid-cols-2">
            <div><p className="mb-2 text-sm font-medium">Empreinte enregistrée</p><HashDisplay hash={orig.hash} /></div>
            <div><p className="mb-2 text-sm font-medium">Empreinte du fichier présenté</p><HashDisplay hash={hash} highlightAgainst={orig.hash} /></div>
          </div>
        )}
        <ProofCard doc={orig} />
        <Button variant="ghost" onClick={() => setOrig(undefined)}>Choisir un autre original</Button>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="font-medium">Sélectionnez le document original</p>
      <Input className="mt-3" placeholder="Rechercher par titre ou identifiant…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-2 max-h-64 space-y-1 overflow-auto">
        {!docs && <Skeleton className="h-24" />}
        {list.map((d) => (
          <button key={d.id} type="button" onClick={() => setOrig(d)} className={cn("flex w-full justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted")}>
            <span>#{d.id} · {d.title} <span className="text-muted-foreground">V{d.version}</span></span>
            <span className="text-muted-foreground">{fmtDate(d.timestamp, false)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
