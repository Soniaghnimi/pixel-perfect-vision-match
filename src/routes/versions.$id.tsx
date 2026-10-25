import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { ProofCard } from "@/components/ProofCard";
import { VersionTimeline } from "@/components/VersionTimeline";
import { useContract } from "@/hooks/web3";
import type { Doc } from "@/lib/types";

export const Route = createFileRoute("/versions/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Chaîne des versions #${params.id} — Sceau` },
      { name: "description", content: "Historique des versions successives d'un document certifié." },
      { property: "og:title", content: "Chaîne des versions — Sceau" },
      { property: "og:description", content: "Suivez les versions V1 → V2 → V3 d'un document certifié." },
    ],
  }),
  component: Versions,
});

function Versions() {
  const id = Number(Route.useParams().id);
  const api = useContract();
  const [chain, setChain] = useState<Doc[]>();
  const [sel, setSel] = useState<Doc>();
  useEffect(() => {
    api.chain(id).then((c) => { setChain(c); setSel(c.find((d) => d.id === id)); });
  }, [api, id]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-semibold">Chaîne des versions</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          {!chain ? <Skeleton className="h-80 rounded-2xl" /> : chain.length === 0 ? <p className="text-muted-foreground">Document introuvable.</p> :
            <VersionTimeline chain={chain} currentId={id} selected={sel?.id} onSelect={setSel} />}
        </div>
        <div className="lg:col-span-7">{sel && <ProofCard key={sel.id} doc={sel} />}</div>
      </div>
    </div>
  );
}
