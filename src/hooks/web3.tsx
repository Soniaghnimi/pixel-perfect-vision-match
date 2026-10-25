import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, type Eip1193Provider } from "ethers";
import artifact from "@/contract/DocumentCertifier.json";
import { CHAIN_ID, NETWORK_NAME, RPC_URL, USE_MOCK } from "@/lib/config";
import { makeMockDocs, MOCK_ME, mockTx } from "@/lib/mock";
import type { CertifyInput, Doc, Status } from "@/lib/types";

declare global {
  interface Window { ethereum?: Eip1193Provider & { on?: (e: string, f: (...a: unknown[]) => void) => void; removeListener?: (e: string, f: (...a: unknown[]) => void) => void } }
}

type Stage = "signing" | "sent" | "confirmed";

interface Api {
  getAll(): Promise<Doc[]>;
  verify(hash: string): Promise<{ status: Status; doc?: Doc }>;
  getDoc(id: number): Promise<Doc | undefined>;
  chain(id: number): Promise<Doc[]>;
  certify(input: CertifyInput, onStage: (s: Stage) => void): Promise<number>;
  revoke(id: number, onStage?: (s: Stage) => void): Promise<void>;
  txHash(id: number): Promise<string | undefined>;
  revokedAt(id: number): Promise<number | undefined>;
}

interface Ctx {
  hasMetaMask: boolean;
  account?: string | undefined;
  chainId?: number | undefined;
  wrongNetwork: boolean;
  contractConfigured: boolean;
  connect(): Promise<void>;
  disconnect(): void;
  switchNetwork(): Promise<void>;
  api: Api;
  revision: number;
  bump(): void;
}

const Web3Ctx = createContext<Ctx | null>(null);
const ZERO = "0x0000000000000000000000000000000000000000";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Ajoute numéro de version et id de version suivante, calculés côté client. */
export function enrich(all: Doc[]): Doc[] {
  const byId = new Map(all.map((d) => [d.id, { ...d }]));
  for (const d of byId.values()) if (d.previousId && byId.has(d.previousId)) byId.get(d.previousId)!.nextId = d.id;
  for (const d of byId.values()) {
    let v = 1, p = d.previousId;
    while (p && byId.has(p)) { v++; p = byId.get(p)!.previousId; }
    d.version = v;
  }
  return [...byId.values()];
}

function toDoc(r: any): Doc {
  return {
    id: Number(r.id), hash: r.hash, issuer: r.issuer, timestamp: Number(r.timestamp),
    previousId: Number(r.previousId), docType: r.docType, title: r.title,
    description: r.description, category: r.category, revoked: r.revoked,
  };
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const [hasMetaMask, setHasMM] = useState(true);
  const [account, setAccount] = useState<string>();
  const [chainId, setChainId] = useState<number>();
  const [revision, setRevision] = useState(0);
  const store = useRef<Doc[] | null>(null);
  const bump = useCallback(() => setRevision((r) => r + 1), []);

  const contractConfigured = USE_MOCK || artifact.address !== ZERO;

  useEffect(() => {
    if (USE_MOCK) return;
    const eth = window.ethereum;
    setHasMM(!!eth);
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((a: string[]) => setAccount(a[0]));
    eth.request({ method: "eth_chainId" }).then((c: string) => setChainId(parseInt(c, 16)));
    const onAcc = (a: unknown) => { setAccount((a as string[])[0]); bump(); };
    const onChain = (c: unknown) => { setChainId(parseInt(c as string, 16)); bump(); };
    eth.on?.("accountsChanged", onAcc);
    eth.on?.("chainChanged", onChain);
    return () => { eth.removeListener?.("accountsChanged", onAcc); eth.removeListener?.("chainChanged", onChain); };
  }, [bump]);

  const connect = useCallback(async () => {
    if (USE_MOCK) { await wait(500); setAccount(MOCK_ME); setChainId(CHAIN_ID); return; }
    if (!window.ethereum) throw new Error("MetaMask n'est pas installé.");
    const a: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
    setAccount(a[0]);
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    const hex = "0x" + CHAIN_ID.toString(16);
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } catch (e: any) {
      if (e?.code === 4902)
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: hex, chainName: NETWORK_NAME, rpcUrls: [RPC_URL], nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 } }] });
      else throw e;
    }
  }, []);

  const api = useMemo<Api>(() => {
    if (USE_MOCK) {
      const docs = () => (store.current ??= makeMockDocs());
      const revokedTimes = new Map<number, number>();
      return {
        async getAll() { await wait(450); return enrich(docs()); },
        async verify(hash) {
          await wait(500);
          const d = enrich(docs()).find((x) => x.hash.toLowerCase() === hash.toLowerCase());
          return d ? { status: d.revoked ? 2 : 1, doc: d } : { status: 0 };
        },
        async getDoc(id) { await wait(250); return enrich(docs()).find((d) => d.id === id); },
        async chain(id) {
          await wait(300);
          const all = enrich(docs());
          const map = new Map(all.map((d) => [d.id, d]));
          let root = map.get(id); if (!root) return [];
          while (root.previousId && map.get(root.previousId)) root = map.get(root.previousId)!;
          const out = [root];
          while (out.at(-1)!.nextId) out.push(map.get(out.at(-1)!.nextId!)!);
          return out;
        },
        async certify(input, onStage) {
          if (docs().some((d) => d.hash === input.hash)) throw new Error("Document deja certifie");
          onStage("signing"); await wait(1100);
          onStage("sent"); await wait(1300);
          const id = docs().length + 1;
          docs().push({ id, hash: input.hash, issuer: MOCK_ME, timestamp: Math.floor(Date.now() / 1000), previousId: input.previousId ?? 0, docType: input.docType, title: input.title, description: input.description, category: input.category, revoked: false });
          onStage("confirmed"); bump();
          return id;
        },
        async revoke(id, onStage) {
          onStage?.("signing"); await wait(900); onStage?.("sent"); await wait(900);
          const d = docs().find((x) => x.id === id); if (d) d.revoked = true;
          revokedTimes.set(id, Math.floor(Date.now() / 1000));
          onStage?.("confirmed"); bump();
        },
        async txHash(id) { return mockTx(id); },
        async revokedAt(id) {
          const d = docs().find((x) => x.id === id);
          return revokedTimes.get(id) ?? (d?.revoked ? d.timestamp + 86400 * 7 : undefined);
        },
      };
    }
    const reader = () => {
      const p = typeof window !== "undefined" && window.ethereum ? new BrowserProvider(window.ethereum) : new JsonRpcProvider(RPC_URL);
      return new Contract(artifact.address, artifact.abi, p) as any;
    };
    const writer = async () => {
      const signer = await new BrowserProvider(window.ethereum!).getSigner();
      return new Contract(artifact.address, artifact.abi, signer) as any;
    };
    const all = async () => enrich(((await reader().getAllDocuments()) as any[]).map(toDoc));
    return {
      getAll: all,
      async verify(hash) {
        const [status, raw] = await reader().verify(hash);
        const s = Number(status) as Status;
        if (s === 0) return { status: 0 };
        const d = (await all()).find((x) => x.id === Number(raw.id));
        return { status: s, doc: d ?? toDoc(raw) };
      },
      async getDoc(id) { return (await all()).find((d) => d.id === id); },
      async chain(id) {
        const ids = ((await reader().getVersionChain(id)) as any[]).map((r) => Number(r.id));
        const map = new Map((await all()).map((d) => [d.id, d]));
        return ids.map((i) => map.get(i)!).filter(Boolean);
      },
      async certify(i, onStage) {
        onStage("signing");
        const c = await writer();
        const tx = i.previousId
          ? await c.certifyNewVersion(i.previousId, i.hash, i.docType, i.title, i.description, i.category)
          : await c.certify(i.hash, i.docType, i.title, i.description, i.category);
        onStage("sent");
        const rc = await tx.wait();
        let id = 0;
        for (const log of rc.logs) { try { const p = c.interface.parseLog(log); if (p?.name === "Certified") id = Number(p.args.id); } catch { /* autre log */ } }
        onStage("confirmed"); bump();
        return id;
      },
      async revoke(id, onStage) {
        onStage?.("signing");
        const tx = await (await writer()).revoke(id);
        onStage?.("sent"); await tx.wait(); onStage?.("confirmed"); bump();
      },
      async txHash(id) {
        const c = reader();
        const ev = await c.queryFilter(c.filters.Certified(id));
        return ev[0]?.transactionHash;
      },
      async revokedAt(id) {
        const c = reader();
        const ev: any[] = await c.queryFilter(c.filters.Revoked(id));
        return ev[0] ? Number(ev[0].args.timestamp) : undefined;
      },
    };
  }, [bump]);

  const value: Ctx = {
    hasMetaMask, account, chainId,
    wrongNetwork: !USE_MOCK && !!account && chainId !== undefined && chainId !== CHAIN_ID,
    contractConfigured, connect, disconnect: () => setAccount(undefined), switchNetwork, api, revision, bump,
  };
  return <Web3Ctx.Provider value={value}>{children}</Web3Ctx.Provider>;
}

function useWeb3() {
  const c = useContext(Web3Ctx);
  if (!c) throw new Error("Web3Provider manquant");
  return c;
}

export const useWallet = () => {
  const { hasMetaMask, account, chainId, wrongNetwork, connect, disconnect, switchNetwork, contractConfigured } = useWeb3();
  return { hasMetaMask, account, chainId, wrongNetwork, connect, disconnect, switchNetwork, contractConfigured };
};
export const useContract = () => useWeb3().api;

export function useDocuments(issuer?: string) {
  const { api, revision } = useWeb3();
  const [docs, setDocs] = useState<Doc[]>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let alive = true;
    api.getAll().then((all) => {
      if (!alive) return;
      setDocs(issuer ? all.filter((d) => d.issuer.toLowerCase() === issuer.toLowerCase()) : all);
    }).catch((e) => alive && setError(String(e?.message ?? e)));
    return () => { alive = false; };
  }, [api, revision, issuer]);
  return { docs, loading: !docs && !error, error };
}
