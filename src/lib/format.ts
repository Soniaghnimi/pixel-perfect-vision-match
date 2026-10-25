import { EXPLORER_URL } from "./config";

export async function sha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const h = await crypto.subtle.digest("SHA-256", buf);
  return "0x" + [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const shortAddr = (a?: string) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "");
export const shortHash = (h?: string) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "");

export const fmtDate = (ts: number, withTime = true) =>
  new Date(ts * 1000).toLocaleString("fr-FR", withTime
    ? { dateStyle: "long", timeStyle: "short" }
    : { dateStyle: "medium" });

export const fmtSize = (n: number) =>
  n < 1024 ? `${n} o` : n < 1048576 ? `${(n / 1024).toFixed(1)} Ko` : `${(n / 1048576).toFixed(1)} Mo`;

export const explorerTx = (tx?: string) => (EXPLORER_URL && tx ? `${EXPLORER_URL}/tx/${tx}` : undefined);

export function humanError(e: unknown): string {
  const err = e as { code?: string | number; message?: string; shortMessage?: string; reason?: string };
  const msg = `${err?.reason ?? ""} ${err?.shortMessage ?? ""} ${err?.message ?? ""}`;
  if (err?.code === 4001 || err?.code === "ACTION_REJECTED" || /user rejected|denied/i.test(msg))
    return "Vous avez refusé la signature dans MetaMask.";
  if (/insufficient funds/i.test(msg)) return "Fonds insuffisants pour payer les frais de transaction.";
  if (/deja certifie|already/i.test(msg)) return "Ce document est déjà certifié.";
  if (/network|chain/i.test(msg)) return "Mauvais réseau : changez de réseau dans MetaMask.";
  return err?.shortMessage || err?.reason || "Une erreur inattendue est survenue.";
}

export function downloadFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
