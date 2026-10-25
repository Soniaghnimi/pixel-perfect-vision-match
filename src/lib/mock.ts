import type { Doc } from "./types";

export const MOCK_ME = "0x12aB34cD56eF7890aBcD1234eF567890AbCdab34";
const OTHERS = [
  "0x9F8e7D6c5B4a39281706F5e4D3c2B1a0987f6E5d",
  "0x4c3B2a1908F7e6D5c4B3a29180F7E6d5C4b3A291",
  "0xA1b2C3d4E5f60718293aB4c5D6e7F8091a2B3c4D",
];

function h(seed: number) {
  let s = "0x";
  let x = seed * 2654435761;
  for (let i = 0; i < 64; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    s += (x % 16).toString(16);
  }
  return s;
}

const DAY = 86400;
const rows: [string, string, string, string, number, number, boolean, number, number][] = [
  // title, type, category, desc, daysAgo, issuerIdx(-1=me), revoked, previousId, seed
  ["Diplôme de Master Informatique", "Diplôme", "Éducation", "Promotion 2025, mention Bien", 320, -1, false, 0, 1],
  ["Contrat de bail – Appartement Lyon", "Contrat", "Juridique", "Bail d'habitation, version initiale", 210, -1, false, 0, 2],
  ["Contrat de bail – Appartement Lyon", "Contrat", "Juridique", "Avenant : révision du loyer", 150, -1, false, 2, 3],
  ["Contrat de bail – Appartement Lyon", "Contrat", "Juridique", "Avenant : ajout d'un garage", 40, -1, false, 3, 4],
  ["Attestation d'assurance habitation", "Attestation", "Assurance", "Période 2026", 95, -1, true, 0, 5],
  ["Facture n°2026-118", "Facture", "Finance", "Prestation de conseil", 12, -1, false, 0, 6],
  ["Rapport d'audit annuel", "Rapport", "Finance", "Exercice 2025", 60, 0, false, 0, 7],
  ["Certificat médical d'aptitude", "Certificat", "Santé", "Aptitude sportive", 25, 1, false, 0, 8],
  ["Attestation de domicile", "Attestation", "Administration", "Mairie annexe", 180, 2, false, 0, 9],
  ["Licence Mathématiques", "Diplôme", "Éducation", "Session de juin", 400, 0, false, 0, 10],
  ["Contrat de prestation", "Contrat", "Juridique", "Développement web", 75, 1, true, 0, 11],
  ["Certificat de formation sécurité", "Certificat", "Éducation", "Module SST", 5, -1, false, 0, 12],
  ["Facture n°2026-042", "Facture", "Finance", "Matériel informatique", 130, 2, false, 0, 13],
  ["Rapport de stage", "Rapport", "Éducation", "Stage de fin d'études", 260, 0, false, 0, 14],
  ["Attestation employeur", "Attestation", "Administration", "Pour demande de prêt", 2, 1, false, 0, 15],
];

export function makeMockDocs(): Doc[] {
  const now = Math.floor(Date.now() / 1000);
  return rows.map((r, i) => ({
    id: i + 1,
    title: r[0], docType: r[1], category: r[2], description: r[3],
    timestamp: now - r[4] * DAY - i * 3600,
    issuer: r[5] === -1 ? MOCK_ME : OTHERS[r[5]],
    revoked: r[6], previousId: r[7], hash: h(r[8]),
  }));
}

export const mockTx = (id: number) => h(1000 + id);
