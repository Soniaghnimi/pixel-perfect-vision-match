import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Ban, BadgeCheck, Download, Files, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/KpiCard";
import { useDocuments, useWallet } from "@/hooks/web3";
import { CATEGORIES } from "@/lib/config";
import { downloadFile, shortAddr } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/statistiques")({
  head: () => ({
    meta: [
      { title: "Statistiques des certifications — Sceau" },
      { name: "description", content: "Volume de documents certifiés, répartition par catégorie et par émetteur." },
      { property: "og:title", content: "Statistiques — Sceau" },
      { property: "og:description", content: "Les chiffres des documents ancrés sur la blockchain." },
    ],
  }),
  component: Stats,
});

const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--muted-foreground)"];
const DAY = 86400000;

function Stats() {
  const { docs } = useDocuments();
  const { account } = useWallet();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cat, setCat] = useState("all");

  const preset = (days?: number) => {
    setTo("");
    setFrom(days ? new Date(Date.now() - days * DAY).toISOString().slice(0, 10) : "");
  };

  const s = useMemo(() => {
    const l = (docs ?? []).filter((d) =>
      (cat === "all" || d.category === cat) &&
      (!from || d.timestamp * 1000 >= new Date(from).getTime()) &&
      (!to || d.timestamp * 1000 <= new Date(to).getTime() + DAY - 1));
    const months = new Map<string, number>();
    [...l].sort((a, b) => a.timestamp - b.timestamp).forEach((d) => {
      const k = new Date(d.timestamp * 1000).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      months.set(k, (months.get(k) ?? 0) + 1);
    });
    const cats = CATEGORIES.map((c) => ({ name: c, value: l.filter((d) => d.category === c).length })).filter((c) => c.value);
    const iss = new Map<string, number>();
    l.forEach((d) => iss.set(d.issuer, (iss.get(d.issuer) ?? 0) + 1));
    const issuers = [...iss].map(([a, n]) => ({ addr: a, name: shortAddr(a), n })).sort((a, b) => b.n - a.n);
    const last30 = l.filter((d) => d.timestamp * 1000 > Date.now() - 30 * DAY).length;
    return { l, months: [...months].map(([m, n]) => ({ m, n })), cats, issuers, revoked: l.filter((d) => d.revoked).length, last30 };
  }, [docs, from, to, cat]);

  const exportCsv = () => {
    const rows = [["Catégorie", "Total", "Valides", "Révoqués"], ...CATEGORIES.map((c) => {
      const x = s.l.filter((d) => d.category === c);
      return [c, x.length, x.filter((d) => !d.revoked).length, x.filter((d) => d.revoked).length];
    })];
    downloadFile("statistiques-sceau.csv", rows.map((r) => r.join(";")).join("\n"), "text/csv;charset=utf-8");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-semibold">Statistiques</h1>
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        {([["7 j", 7], ["30 j", 30], ["12 mois", 365], ["Tout", undefined]] as const).map(([l, d]) => (
          <Button key={l} size="sm" variant="outline" onClick={() => preset(d)}>{l}</Button>
        ))}
        <Input type="date" className="w-auto" aria-label="Date de début" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="w-auto" aria-label="Date de fin" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-48" aria-label="Catégorie"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Toutes catégories</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!docs ? <Skeleton className="mt-6 h-96 rounded-2xl" /> : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total ancrés" value={s.l.length} icon={Files} hint={`+${s.last30} sur 30 jours`} />
            <KpiCard label="Valides" value={s.l.length - s.revoked} icon={BadgeCheck} tone="text-valid" hint={s.l.length ? `${Math.round(((s.l.length - s.revoked) / s.l.length) * 100)} %` : undefined} />
            <KpiCard label="Révoqués" value={s.revoked} icon={Ban} tone="text-revoked" />
            <KpiCard label="Émetteurs distincts" value={s.issuers.length} icon={Users} tone="text-gold" />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <div className="rounded-2xl border bg-card p-5 lg:col-span-8">
              <h2 className="text-lg font-semibold">Documents certifiés par mois</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer>
                  <AreaChart data={s.months}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="n" name="Documents" stroke="var(--chart-1)" fill="var(--chart-2)" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-5 lg:col-span-4">
              <h2 className="text-lg font-semibold">Par catégorie</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={s.cats} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {s.cats.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {s.cats.map((c, i) => <li key={c.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />{c.name} ({c.value})</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border bg-card p-5 lg:col-span-6">
              <h2 className="text-lg font-semibold">Par émetteur</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer>
                  <BarChart data={s.issuers} layout="vertical">
                    <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="name" width={90} stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="n" name="Documents" radius={[0, 6, 6, 0]}>
                      {s.issuers.map((x) => <Cell key={x.addr} fill={x.addr === account ? "var(--chart-2)" : "var(--chart-1)"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {account && <p className="text-xs text-muted-foreground">En or : votre compte.</p>}
            </div>
            <div className="rounded-2xl border bg-card p-5 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Récapitulatif</h2>
                <Button size="sm" variant="outline" onClick={exportCsv}><Download /> Exporter CSV</Button>
              </div>
              <table className="mt-4 w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Catégorie</th><th>Total</th><th>Valides</th><th>Révoqués</th></tr></thead>
                <tbody>
                  {CATEGORIES.map((c) => {
                    const x = s.l.filter((d) => d.category === c);
                    return (
                      <tr key={c} className={cn("border-t", !x.length && "text-muted-foreground")}>
                        <td className="py-2">{c}</td><td>{x.length}</td><td className="text-valid">{x.filter((d) => !d.revoked).length}</td><td className="text-revoked">{x.filter((d) => d.revoked).length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
