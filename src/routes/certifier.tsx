import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, FilePlus2, GitBranch, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropZone } from "@/components/DropZone";
import { HashDisplay } from "@/components/HashDisplay";
import { ProofCard } from "@/components/ProofCard";
import { useContract, useDocuments, useWallet } from "@/hooks/web3";
import { CATEGORIES, DOC_TYPES } from "@/lib/config";
import { fmtDate, humanError, sha256 } from "@/lib/format";
import type { Doc } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/certifier")({
  validateSearch: z.object({ from: z.coerce.number().optional() }),
  head: () => ({
    meta: [
      { title: "Certifier un document — Sceau" },
      { name: "description", content: "Calculez l'empreinte de votre document et ancrez-la sur la blockchain avec MetaMask." },
      { property: "og:title", content: "Certifier un document — Sceau" },
      { property: "og:description", content: "Ancrez l'empreinte SHA-256 de votre document sur Ethereum." },
    ],
  }),
  component: Certify,
});

const STEPS = ["Fichier", "Informations", "Confirmation"];
type Stage = "idle" | "signing" | "sent" | "confirmed";

function Confetti() {
  const [bits] = useState(() => Array.from({ length: 28 }, () => ({ x: Math.random() * 100, d: Math.random() * 0.6, r: Math.random() * 360 })));
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <motion.span key={i} className="absolute top-0 h-2 w-1.5 rounded-sm bg-gold" style={{ left: `${b.x}%` }}
          initial={{ y: -20, rotate: b.r, opacity: 1 }} animate={{ y: "100vh", rotate: b.r + 360, opacity: 0 }} transition={{ duration: 2.4, delay: b.d, ease: "easeIn" }} />
      ))}
    </div>
  );
}

function Certify() {
  const { from } = Route.useSearch();
  const wallet = useWallet();
  const api = useContract();
  const { docs: mine } = useDocuments(wallet.account);

  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File>();
  const [hash, setHash] = useState<string>();
  const [hashing, setHashing] = useState(false);
  const [mode, setMode] = useState<"new" | "version">(from ? "version" : "new");
  const [prevId, setPrevId] = useState<number | undefined>(from);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ docType: "", title: "", description: "", category: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<Stage>("idle");
  const [duplicate, setDuplicate] = useState<Doc>();
  const [result, setResult] = useState<Doc>();

  const candidates = useMemo(() => (mine ?? []).filter((d) => !d.revoked && !d.nextId), [mine]);
  const prev = candidates.find((d) => d.id === prevId);

  useEffect(() => {
    if (from && prev && !form.title) setForm({ docType: prev.docType, title: prev.title, description: "", category: prev.category });
  }, [from, prev, form.title]);

  const onFile = async (f: File) => {
    setFile(f); setHash(undefined); setDuplicate(undefined); setHashing(true);
    const h = await sha256(f);
    setHash(h); setHashing(false);
    const v = await api.verify(h).catch(() => undefined);
    if (v?.doc) setDuplicate(v.doc);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.docType) e.docType = "Choisissez un type.";
    if (!form.title.trim()) e.title = "Le titre est obligatoire.";
    else if (form.title.length > 120) e.title = "120 caractères maximum.";
    if (!form.category) e.category = "Choisissez une catégorie.";
    if (mode === "version" && !prevId) e.prev = "Sélectionnez le document d'origine.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!hash) return;
    try {
      const v = await api.verify(hash);
      if (v.doc) { setDuplicate(v.doc); toast.error("Ce document est déjà certifié."); return; }
      const id = await api.certify({ hash, ...form, previousId: mode === "version" ? prevId : undefined }, setStage);
      const d = await api.getDoc(id);
      setResult(d);
      toast.success("Document certifié avec succès");
    } catch (e) {
      setStage("idle");
      toast.error(humanError(e));
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Confetti />
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold">Document certifié</h1>
          <p className="mt-2 text-muted-foreground">Son empreinte est désormais ancrée dans la blockchain.</p>
        </div>
        <ProofCard doc={result} stamp />
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => { setResult(undefined); setStep(0); setFile(undefined); setHash(undefined); setStage("idle"); setForm({ docType: "", title: "", description: "", category: "" }); }}>
            Certifier un autre document
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-semibold">Certifier un document</h1>
      <ol className="mt-8 flex items-center gap-2" aria-label="Étapes">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm", i < step ? "bg-valid text-primary-foreground border-valid" : i === step ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn("text-sm", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
            {i < 2 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-soft">
        {step === 0 && (
          <div className="space-y-5">
            <DropZone file={file} onFile={onFile} />
            {hashing && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Calcul de l'empreinte…</p>}
            {hash && (
              <div>
                <Label className="mb-2 block">Empreinte SHA-256</Label>
                <HashDisplay hash={hash} animate />
              </div>
            )}
            {duplicate && (
              <div className="rounded-xl border border-modified/40 bg-modified/10 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4 text-modified" /> Ce document est déjà certifié (#{duplicate.id}, {fmtDate(duplicate.timestamp, false)}).</p>
                <Link to="/verifier" search={{ id: duplicate.id }} className="mt-1 inline-block underline">Voir la preuve existante</Link>
              </div>
            )}
            <div className="flex justify-end">
              <Button disabled={!hash || !!duplicate} onClick={() => setStep(1)}>Continuer <ArrowRight /></Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Mode">
              {([["new", FilePlus2, "Nouveau document", "Première certification"], ["version", GitBranch, "Nouvelle version", "D'un document déjà certifié"]] as const).map(([v, I, t, d]) => (
                <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)}
                  className={cn("rounded-xl border p-4 text-left transition", mode === v ? "border-gold bg-accent ring-2 ring-gold/30" : "hover:border-gold/50")}>
                  <I className="h-5 w-5 text-primary" /><p className="mt-2 font-medium">{t}</p><p className="text-sm text-muted-foreground">{d}</p>
                </button>
              ))}
            </div>

            {mode === "version" && (
              <div className="space-y-2">
                <Label>Document d'origine</Label>
                {!wallet.account ? (
                  <p className="text-sm text-muted-foreground">Connectez MetaMask pour voir vos documents.</p>
                ) : (
                  <>
                    <Input placeholder="Rechercher par titre…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    <div className="max-h-52 space-y-1 overflow-auto rounded-lg border p-1">
                      {candidates.filter((d) => d.title.toLowerCase().includes(search.toLowerCase())).map((d) => (
                        <button key={d.id} type="button" onClick={() => setPrevId(d.id)}
                          className={cn("flex w-full justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted", prevId === d.id && "bg-accent")}>
                          <span>{d.title} <span className="text-muted-foreground">· V{d.version}</span></span>
                          <span className="text-muted-foreground">{fmtDate(d.timestamp, false)}</span>
                        </button>
                      ))}
                      {candidates.length === 0 && <p className="p-3 text-sm text-muted-foreground">Aucun document éligible.</p>}
                    </div>
                  </>
                )}
                {errors.prev && <p className="text-sm text-destructive">{errors.prev}</p>}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={form.docType} onValueChange={(v) => setForm({ ...form, docType: v })}>
                  <SelectTrigger id="type"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                {errors.docType && <p className="text-sm text-destructive">{errors.docType}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat">Catégorie / Domaine</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger id="cat"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <p className="flex gap-2 rounded-lg bg-modified/10 p-3 text-sm"><AlertTriangle className="h-4 w-4 shrink-0 text-modified" /> Titre et description seront publics sur la blockchain. N'y mettez pas de données personnelles sensibles.</p>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft /> Retour</Button>
              <Button onClick={() => validate() && setStep(2)}>Continuer <ArrowRight /></Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Récapitulatif</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-[150px_1fr]">
              <dt className="text-muted-foreground">Fichier</dt><dd>{file?.name}</dd>
              <dt className="text-muted-foreground">Mode</dt><dd>{mode === "new" ? "Nouveau document" : `Nouvelle version de « ${prev?.title} » (V${(prev?.version ?? 0) + 1})`}</dd>
              <dt className="text-muted-foreground">Type</dt><dd>{form.docType}</dd>
              <dt className="text-muted-foreground">Catégorie</dt><dd>{form.category}</dd>
              <dt className="text-muted-foreground">Titre</dt><dd>{form.title}</dd>
              {form.description && <><dt className="text-muted-foreground">Description</dt><dd>{form.description}</dd></>}
            </dl>
            {hash && <HashDisplay hash={hash} />}
            {stage !== "idle" && (
              <div className="space-y-2 rounded-xl border p-4 text-sm">
                {(["signing", "sent", "confirmed"] as const).map((s, i) => {
                  const idx = ["signing", "sent", "confirmed"].indexOf(stage);
                  return (
                    <p key={s} className={cn("flex items-center gap-2", i > idx && "text-muted-foreground")}>
                      {i < idx || stage === "confirmed" ? <Check className="h-4 w-4 text-valid" /> : i === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="h-4 w-4" />}
                      {["En attente de signature…", "Transaction envoyée…", "Confirmée"][i]}
                    </p>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" disabled={stage !== "idle"} onClick={() => setStep(1)}><ArrowLeft /> Retour</Button>
              {wallet.account ? (
                <Button disabled={stage !== "idle"} onClick={submit}>{stage !== "idle" ? <Loader2 className="animate-spin" /> : <Wallet />} Certifier avec MetaMask</Button>
              ) : (
                <Button onClick={() => wallet.connect().catch((e) => toast.error(humanError(e)))}><Wallet /> Connecter MetaMask</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
