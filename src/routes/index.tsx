import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Clock, FileSearch, FileUp, Fingerprint, Link2, Lock, ShieldCheck, BadgeCheck, Ban, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SealLogo } from "@/components/SealLogo";
import { KpiCard } from "@/components/KpiCard";
import { useDocuments } from "@/hooks/web3";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sceau — Preuve d'authenticité infalsifiable pour vos documents" },
      { name: "description", content: "Certifiez vos documents sur Ethereum sans jamais les envoyer : seule leur empreinte SHA-256 est ancrée." },
      { property: "og:title", content: "Sceau — Preuve d'authenticité infalsifiable" },
      { property: "og:description", content: "Certifiez et vérifiez vos documents sur la blockchain, en toute confidentialité." },
    ],
  }),
  component: Home,
});

function Hero() {
  return (
    <div className="relative mx-auto h-72 w-64">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
        className="absolute inset-0 rounded-xl border bg-card p-6 shadow-soft">
        <div className="h-3 w-2/3 rounded bg-muted" />
        {[...Array(7)].map((_, i) => <div key={i} className="mt-3 h-2 rounded bg-muted" style={{ width: `${90 - (i % 3) * 15}%` }} />)}
        <div className="mt-6 font-mono text-[10px] text-muted-foreground">0x7f3a…c91e</div>
      </motion.div>
      <motion.div className="absolute -bottom-6 -right-8" initial={{ scale: 2.5, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -10 }} transition={{ delay: 0.7, type: "spring", stiffness: 220, damping: 12 }}>
        <SealLogo size={110} />
      </motion.div>
      <motion.div className="absolute -left-10 top-10 text-gold" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
        <Link2 className="h-10 w-10" />
      </motion.div>
    </div>
  );
}

function Home() {
  const { docs } = useDocuments();
  const revoked = docs?.filter((d) => d.revoked).length ?? 0;
  return (
    <div>
      <section className="guilloche border-b">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="text-xs uppercase tracking-[0.25em] text-gold">Certification sur Ethereum</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">Donnez à vos documents une preuve d'authenticité infalsifiable</h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">Sceau calcule l'empreinte unique de votre fichier et l'ancre dans la blockchain. N'importe qui pourra ensuite vérifier qu'il n'a pas été modifié.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/certifier"><FileUp /> Certifier un document</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/verifier"><FileSearch /> Vérifier un document</Link></Button>
            </div>
          </div>
          <div className="md:col-span-5"><Hero /></div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-semibold">Comment ça marche</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { i: FileUp, t: "Choisissez le fichier", d: "Diplôme, contrat, facture… tout format est accepté." },
            { i: Fingerprint, t: "Son empreinte est calculée localement", d: "Un code SHA-256 unique est généré dans votre navigateur." },
            { i: Link2, t: "Elle est ancrée dans la blockchain", d: "Signée avec MetaMask, elle devient horodatée et inaltérable." },
          ].map((s, n) => (
            <div key={s.t} className="rounded-2xl border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-3"><span className="font-serif text-3xl text-gold">{n + 1}</span><s.i className="h-6 w-6 text-primary" /></div>
              <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            { i: Lock, t: "Confidentialité", d: "Votre document ne quitte jamais votre appareil." },
            { i: ShieldCheck, t: "Intégrité", d: "Le moindre changement d'un octet produit une empreinte différente." },
            { i: Clock, t: "Horodatage", d: "La date du bloc prouve l'existence du document à cet instant." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border p-6">
              <c.i className="h-5 w-5 text-gold" />
              <h3 className="mt-3 font-semibold">{c.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="text-2xl font-semibold">En direct sur le contrat</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {docs ? (
            <>
              <KpiCard label="Documents ancrés" value={docs.length} icon={Files} />
              <KpiCard label="Valides" value={docs.length - revoked} icon={BadgeCheck} tone="text-valid" />
              <KpiCard label="Révoqués" value={revoked} icon={Ban} tone="text-revoked" />
            </>
          ) : [0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </section>
    </div>
  );
}
