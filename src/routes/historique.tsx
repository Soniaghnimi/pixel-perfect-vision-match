import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Ban, Eye, FilePlus2, GitBranch, Inbox, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { useContract, useDocuments, useWallet } from "@/hooks/web3";
import { CATEGORIES } from "@/lib/config";
import { fmtDate, humanError } from "@/lib/format";
import type { Doc } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/historique")({
  head: () => ({
    meta: [
      { title: "Historique de mes certifications — Sceau" },
      { name: "description", content: "Retrouvez, filtrez et révoquez les documents que vous avez certifiés." },
      { property: "og:title", content: "Historique — Sceau" },
      { property: "og:description", content: "Tous vos documents certifiés sur la blockchain." },
    ],
  }),
  component: History,
});

function History() {
  const w = useWallet();
  const api = useContract();
  const { docs } = useDocuments(w.account);
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all" | "valid" | "revoked">("all");
  const [cat, setCat] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("recent");
  const [target, setTarget] = useState<Doc>();
  const [revoking, setRevoking] = useState<number>();

  const filtered = useMemo(() => {
    let l = (docs ?? []).filter((d) =>
      (!q || d.title.toLowerCase().includes(q.toLowerCase())) &&
      (cat === "all" || d.category === cat) &&
      (!from || d.timestamp * 1000 >= new Date(from).getTime()) &&
      (!to || d.timestamp * 1000 <= new Date(to).getTime() + 86399999));
    const base = l;
    if (st !== "all") l = l.filter((d) => (st === "revoked") === d.revoked);
    l = [...l].sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "old" ? a.timestamp - b.timestamp : b.timestamp - a.timestamp);
    return { list: l, counts: { all: base.length, valid: base.filter((d) => !d.revoked).length, revoked: base.filter((d) => d.revoked).length } };
  }, [docs, q, st, cat, from, to, sort]);

  const doRevoke = async () => {
    if (!target) return;
    const t = target; setTarget(undefined); setRevoking(t.id);
    try { await api.revoke(t.id); toast.success(`« ${t.title} » a été révoqué`); }
    catch (e) { toast.error(humanError(e)); }
    finally { setRevoking(undefined); }
  };

  if (!w.account) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Wallet className="mx-auto h-12 w-12 text-gold" strokeWidth={1.3} />
        <h1 className="mt-4 text-3xl font-semibold">Historique</h1>
        <p className="mt-2 text-muted-foreground">Connectez votre portefeuille pour voir les documents que vous avez certifiés.</p>
        <Button className="mt-6" onClick={() => w.connect().catch((e) => toast.error(humanError(e)))}><Wallet /> Connecter MetaMask</Button>
      </div>
    );
  }

  const Actions = ({ d }: { d: Doc }) => (
    <div className="flex flex-wrap gap-1">
      <Button asChild size="sm" variant="ghost" title="Voir la preuve"><Link to="/verifier" search={{ id: d.id }}><Eye /><span className="lg:sr-only">Preuve</span></Link></Button>
      <Button asChild size="sm" variant="ghost" title="Versions"><Link to="/versions/$id" params={{ id: String(d.id) }}><GitBranch /><span className="lg:sr-only">Versions</span></Link></Button>
      <Button asChild size="sm" variant="ghost" title="Nouvelle version" disabled={d.revoked || !!d.nextId}>
        <Link to="/certifier" search={{ from: d.id }} className={cn((d.revoked || d.nextId) && "pointer-events-none opacity-40")}><FilePlus2 /><span className="lg:sr-only">Nouvelle version</span></Link>
      </Button>
      <Button size="sm" variant="ghost" className="text-revoked" title="Révoquer" disabled={d.revoked || revoking === d.id} onClick={() => setTarget(d)}><Ban /><span className="lg:sr-only">Révoquer</span></Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-semibold">Historique</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {([["all", "Tous"], ["valid", "Valides"], ["revoked", "Révoqués"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSt(k)} className={cn("rounded-full border px-3 py-1 text-sm", st === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {l} · {filtered.counts[k]}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Input aria-label="Recherche" placeholder="Rechercher un titre…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger aria-label="Catégorie"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Toutes catégories</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" aria-label="Date de début" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" aria-label="Date de fin" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger aria-label="Tri"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="recent">Plus récent</SelectItem><SelectItem value="old">Plus ancien</SelectItem><SelectItem value="title">Titre</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        {!docs ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : filtered.list.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-16 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.3} />
            <p className="mt-3 text-muted-foreground">Aucun document pour ces filtres</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="p-3">#</th><th className="p-3">Titre</th><th className="p-3">Type</th><th className="p-3">Catégorie</th><th className="p-3">Date</th><th className="p-3">État</th><th className="p-3">Version</th><th className="p-3">Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.list.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="p-3 font-mono text-xs">{d.id}</td>
                      <td className="p-3 font-medium">{d.title}</td>
                      <td className="p-3">{d.docType}</td>
                      <td className="p-3">{d.category}</td>
                      <td className="p-3 whitespace-nowrap">{fmtDate(d.timestamp, false)}</td>
                      <td className="p-3"><StatusBadge status={d.revoked ? "revoked" : "valid"} /></td>
                      <td className="p-3">V{d.version}</td>
                      <td className="p-3"><Actions d={d} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {filtered.list.map((d) => (
                <div key={d.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-2"><p className="font-medium">{d.title}</p><StatusBadge status={d.revoked ? "revoked" : "valid"} /></div>
                  <p className="mt-1 text-xs text-muted-foreground">#{d.id} · {d.docType} · {d.category} · V{d.version} · {fmtDate(d.timestamp, false)}</p>
                  <div className="mt-2"><Actions d={d} /></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-revoked">Révoquer « {target?.title} » ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Le document sera déclaré invalide.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={doRevoke}>Révoquer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
