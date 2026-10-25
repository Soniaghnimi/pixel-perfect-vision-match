export type Status = 0 | 1 | 2; // Unknown, Valid, Revoked
export type UiStatus = "valid" | "revoked" | "unknown" | "modified";

export interface Doc {
  id: number;
  hash: string;
  issuer: string;
  timestamp: number; // secondes
  previousId: number;
  docType: string;
  title: string;
  description: string;
  category: string;
  revoked: boolean;
  nextId?: number;
  version?: number;
}

export interface CertifyInput {
  hash: string;
  docType: string;
  title: string;
  description: string;
  category: string;
  previousId?: number;
}
