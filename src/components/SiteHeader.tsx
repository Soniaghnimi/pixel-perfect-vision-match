import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Copy, LogOut, Menu, Moon, Sun, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useWallet } from "@/hooks/web3";
import { NETWORK_NAME, USE_MOCK } from "@/lib/config";
import { humanError, shortAddr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SealLogo } from "./SealLogo";

const NAV = [
  { to: "/certifier", label: "Certifier" },
  { to: "/verifier", label: "Vérifier" },
  { to: "/historique", label: "Historique" },
  { to: "/statistiques", label: "Statistiques" },
] as const;

export function SiteHeader() {
  const w = useWallet();
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(localStorage.getItem("theme") === "dark"); }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const connect = async () => { try { await w.connect(); toast.success("Portefeuille connecté"); } catch (e) { toast.error(humanError(e)); } };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <SealLogo size={34} />
          <span className="font-serif text-xl font-semibold">Sceau</span>
        </Link>
        <nav className="ml-6 hidden gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium bg-muted" }}>{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className={cn("hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs sm:inline-flex", w.wrongNetwork ? "text-revoked" : "text-muted-foreground")}>
            <span className={cn("h-2 w-2 rounded-full", w.wrongNetwork ? "bg-revoked" : "bg-valid")} />
            {w.wrongNetwork ? "Mauvais réseau" : USE_MOCK ? "Démo" : NETWORK_NAME}
          </span>
          {w.account ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="font-mono">{shortAddr(w.account)}</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(w.account!); toast.success("Adresse copiée"); }}><Copy /> Copier l'adresse</DropdownMenuItem>
                <DropdownMenuItem onClick={w.disconnect}><LogOut /> Déconnecter</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={connect}><Wallet /> <span className="hidden sm:inline">Connecter MetaMask</span></Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Basculer le thème" onClick={() => setDark((d) => !d)}>{dark ? <Sun /> : <Moon />}</Button>
          <Sheet>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu"><Menu /></Button></SheetTrigger>
            <SheetContent side="right">
              <SheetTitle className="font-serif">Sceau</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1">
                {NAV.map((n) => <Link key={n.to} to={n.to} className="rounded-md px-3 py-2 hover:bg-muted">{n.label}</Link>)}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <AlertBar />
    </header>
  );
}

function AlertBar() {
  const w = useWallet();
  let msg: string | undefined; let action: React.ReactNode = null;
  if (!USE_MOCK && !w.hasMetaMask) {
    msg = "MetaMask n'est pas installé.";
    action = <a className="underline" href="https://metamask.io/download/" target="_blank" rel="noreferrer">Installer MetaMask</a>;
  } else if (w.wrongNetwork) {
    msg = `Vous n'êtes pas sur le réseau ${NETWORK_NAME}.`;
    action = <Button size="sm" variant="outline" onClick={() => w.switchNetwork().catch((e) => toast.error(humanError(e)))}>Changer de réseau</Button>;
  } else if (!w.contractConfigured) {
    msg = "Le smart contract n'est pas configuré (adresse manquante).";
  }
  if (!msg) return null;
  return (
    <div className="border-t bg-modified/10 text-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2">
        <AlertTriangle className="h-4 w-4 text-modified" /> {msg} {action}
      </div>
    </div>
  );
}
