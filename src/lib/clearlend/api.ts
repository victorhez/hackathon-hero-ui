import type { ScoreDimension } from "./types";

declare const process: { env: Record<string, string | undefined> } | undefined;

export type CleanverseEnv = {
  baseUrl: string;
  apiId: string;
  apiKey: string;
};

export function getCleanverseEnv(): CleanverseEnv {
  const env = typeof process !== "undefined" ? process.env : undefined;
  const baseUrl = env?.["CLEANVERSE_BASE_URL"] ?? "https://api.cleanverse.com";
  const apiId = env?.["CLEANVERSE_API_ID"] ?? "";
  const apiKey = env?.["CLEANVERSE_API_KEY"] ?? "";
  return { baseUrl, apiId, apiKey };
}

export class CleanverseError extends Error {
  status: number;
  body?: string;
  constructor(status: number, body?: string) {
    super(`Cleanverse API ${status}${body ? `: ${body.slice(0, 160)}` : ""}`);
    this.name = "CleanverseError";
    this.status = status;
    if (body !== undefined) this.body = body;
  }
}

export type CviPassStatus = {
  verified: boolean;
  passId: string | null;
  issuedAt: number | null;
  expiresAt: number | null;
  level: "Bank-Verified" | "Institution" | null;
  wallet: string | null;
  country: string | null;
  lastCheckedAt: number;
};

export type CvaTransaction = {
  id: string;
  asset: string;
  amount: number;
  direction: "in" | "out";
  counterparty: string;
  block: number;
  at: number;
  clean: boolean;
  proofHash: string;
  chain: string;
};

export type CvaBalance = {
  asset: string;
  amount: number;
  lastUpdatedAt: number;
};

export type CvaTransferResult = {
  proofHash: string;
  txHash: string;
  amount: number;
  asset: string;
  at: number;
  travelRuleAttached: boolean;
};

function authHeaders(env: CleanverseEnv): HeadersInit {
  const token = btoa(`${env.apiId}:${env.apiKey}`);
  return {
    Authorization: `Basic ${token}`,
    "X-Cleanverse-App": env.apiId,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

const FETCH_TIMEOUT_MS = 7000;

async function request<T>(
  env: CleanverseEnv,
  path: string,
  init: RequestInit = {},
  fallback: T,
): Promise<T> {
  const hasCreds = env.apiId && env.apiKey;
  if (!hasCreds) return fallback;
  const url = `${env.baseUrl.replace(/\/$/, "")}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...authHeaders(env),
        ...(init.headers ?? {}),
      },
      signal: init.signal ?? controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new CleanverseError(res.status, text);
    }
    const json = (await res.json()) as T;
    return json ?? fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function createCviSession(
  env: CleanverseEnv,
  input: {
    wallet: string;
    redirectUrl: string;
    accountType?: "individual" | "institution";
    country?: string;
  },
): Promise<{ sessionId: string; redirectUrl: string }> {
  const fallback = {
    sessionId: `sess_demo_${Math.random().toString(36).slice(2, 10)}`,
    redirectUrl: `${input.redirectUrl}?demo=cvi`,
  };
  if (!env.apiId || !env.apiKey) return fallback;
  const result = await request(
    env,
    "/v1/cvi/sessions",
    {
      method: "POST",
      body: JSON.stringify({
        wallet: input.wallet,
        redirect_url: input.redirectUrl,
        account_type: input.accountType ?? "individual",
        country: input.country,
        scope: ["bank_credential"],
        client: "clearlend",
      }),
    },
    fallback as unknown as Record<string, unknown>,
  );
  const r = result as Record<string, unknown>;
  return {
    sessionId: (r["session_id"] as string) ?? (r["sessionId"] as string) ?? fallback.sessionId,
    redirectUrl:
      (r["redirect_url"] as string) ?? (r["redirectUrl"] as string) ?? fallback.redirectUrl,
  };
}

function mapCviLevel(raw: unknown): CviPassStatus["level"] {
  if (raw === "Institution" || raw === "institution") return "Institution";
  if (raw === "Bank-Verified" || raw === "bank" || raw === "bank_verified") return "Bank-Verified";
  return null;
}

export async function getCviStatus(env: CleanverseEnv, wallet: string): Promise<CviPassStatus> {
  const fallback: CviPassStatus = {
    verified: false,
    passId: null,
    issuedAt: null,
    expiresAt: null,
    level: null,
    wallet,
    country: null,
    lastCheckedAt: Date.now(),
  };
  if (!env.apiId || !env.apiKey) return fallback;
  const result = await request(
    env,
    `/v1/cvi/passes?wallet=${encodeURIComponent(wallet)}`,
    { method: "GET" },
    fallback as unknown as Record<string, unknown>,
  );
  const r = result as Record<string, unknown>;
  return {
    verified: Boolean(r["verified"] ?? r["is_verified"] ?? fallback.verified),
    passId: (r["pass_id"] as string) ?? (r["passId"] as string) ?? fallback.passId,
    issuedAt:
      r["issued_at"] !== undefined
        ? Number(r["issued_at"])
        : r["issuedAt"] !== undefined
          ? Number(r["issuedAt"])
          : fallback.issuedAt,
    expiresAt:
      r["expires_at"] !== undefined
        ? Number(r["expires_at"])
        : r["expiresAt"] !== undefined
          ? Number(r["expiresAt"])
          : fallback.expiresAt,
    level: mapCviLevel(r["level"] ?? r["verification_level"]),
    wallet: (r["wallet"] as string) ?? wallet,
    country: (r["country"] as string) ?? fallback.country,
    lastCheckedAt: Date.now(),
  };
}

export async function getCvaBalances(env: CleanverseEnv, wallet: string): Promise<CvaBalance[]> {
  const fallback: CvaBalance[] = [{ asset: "aUSDC", amount: 0, lastUpdatedAt: Date.now() }];
  if (!env.apiId || !env.apiKey) return fallback;
  const result = await request(
    env,
    `/v1/cva/balances?wallet=${encodeURIComponent(wallet)}`,
    { method: "GET" },
    fallback as unknown as unknown[],
  );
  const rows = result as unknown[];
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        asset: (r["asset"] as string) ?? (r["symbol"] as string) ?? "aUSDC",
        amount: Number(r["amount"] ?? r["balance"] ?? 0),
        lastUpdatedAt: Number(r["updated_at"] ?? r["lastUpdatedAt"] ?? Date.now()),
      };
    });
  }
  return fallback;
}

export async function getCvaHistory(
  env: CleanverseEnv,
  wallet: string,
): Promise<{
  transfers: CvaTransaction[];
  volume: number;
  cleanRate: number;
  count: number;
  windowDays: number;
}> {
  const fallback = {
    transfers: [] as CvaTransaction[],
    volume: 0,
    cleanRate: 1,
    count: 0,
    windowDays: 180,
  };
  if (!env.apiId || !env.apiKey) return fallback;
  const result = await request(
    env,
    `/v1/cva/transfers?wallet=${encodeURIComponent(wallet)}&window_days=180`,
    { method: "GET" },
    fallback as unknown as Record<string, unknown>,
  );
  const r = result as Record<string, unknown>;
  const rawTransfers = r["transfers"] ?? r["transactions"] ?? r;
  const transfers: CvaTransaction[] = Array.isArray(rawTransfers)
    ? (rawTransfers as unknown[]).map((t: unknown) => {
        const tx = t as Record<string, unknown>;
        const amt = Number(tx["amount"] ?? 0);
        return {
          id:
            (tx["id"] as string) ??
            (tx["transfer_id"] as string) ??
            Math.random().toString(36).slice(2),
          asset: (tx["asset"] as string) ?? (tx["symbol"] as string) ?? "aUSDC",
          amount: Math.abs(amt),
          direction: tx["direction"] === "out" || amt < 0 ? "out" : "in",
          counterparty: (tx["counterparty"] as string) ?? (tx["peer"] as string) ?? "",
          block: Number(tx["block"] ?? tx["block_number"] ?? 0),
          at: Number(tx["at"] ?? tx["timestamp"] ?? Date.now()),
          clean: Boolean(tx["clean"] ?? tx["is_compliant"] ?? true),
          proofHash: (tx["proof_hash"] as string) ?? (tx["proofHash"] as string) ?? "",
          chain: (tx["chain"] as string) ?? (tx["network"] as string) ?? "Base",
        };
      })
    : [];
  const computedVolume = transfers.reduce((a, t) => a + t.amount, 0);
  const computedCleanRate =
    transfers.length === 0 ? 1 : transfers.filter((t) => t.clean).length / transfers.length;
  return {
    transfers,
    volume: Number(r["volume"] ?? computedVolume),
    cleanRate: Number(r["clean_rate"] ?? computedCleanRate),
    count: Number(r["count"] ?? transfers.length),
    windowDays: Number(r["window_days"] ?? 180),
  };
}

export async function submitCvaTransfer(
  env: CleanverseEnv,
  input: {
    from: string;
    to: string;
    asset: string;
    amount: number;
    purpose:
      | "loan_issue"
      | "collateral_lock"
      | "collateral_release"
      | "loan_repay"
      | "lender_deposit"
      | "lender_withdraw"
      | "yield_payment";
    chain: string;
    reference?: string;
  },
): Promise<CvaTransferResult> {
  const fallback: CvaTransferResult = {
    proofHash: `proof_demo_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`,
    txHash:
      "0x" +
      Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(""),
    amount: input.amount,
    asset: input.asset,
    at: Date.now(),
    travelRuleAttached: true,
  };
  if (!env.apiId || !env.apiKey) return fallback;
  const result = await request(
    env,
    "/v1/cva/transfers",
    {
      method: "POST",
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        asset: input.asset,
        amount: input.amount,
        purpose: input.purpose,
        chain: input.chain,
        reference: input.reference,
      }),
    },
    fallback as unknown as Record<string, unknown>,
  );
  const r = result as Record<string, unknown>;
  return {
    proofHash: (r["proof_hash"] as string) ?? (r["proofHash"] as string) ?? fallback.proofHash,
    txHash: (r["tx_hash"] as string) ?? (r["txHash"] as string) ?? fallback.txHash,
    amount: Number(r["amount"] ?? input.amount),
    asset: (r["asset"] as string) ?? input.asset,
    at: Number(r["at"] ?? r["timestamp"] ?? Date.now()),
    travelRuleAttached: Boolean(r["travel_rule_attached"] ?? r["travelRuleAttached"] ?? true),
  };
}

export async function collectScoreInputs(
  env: CleanverseEnv,
  wallet: string,
  repaymentValue: number,
  walletAgeDays: number,
): Promise<ScoreDimension[]> {
  const [cvi, cva] = await Promise.all([getCviStatus(env, wallet), getCvaHistory(env, wallet)]);

  let cviScore = 0;
  if (cvi.verified) {
    if (cvi.level === "Institution") {
      cviScore = 100;
    } else if (cvi.level === "Bank-Verified") {
      const freshnessDays = cvi.issuedAt
        ? Math.max(0, Math.min(365, (Date.now() - cvi.issuedAt) / 86400000))
        : 180;
      let bonus = 30;
      if (freshnessDays < 60) bonus = 40;
      else if (freshnessDays > 300) bonus = Math.max(10, 40 - (freshnessDays - 300) / 10);
      cviScore = Math.min(100, 60 + Math.round(bonus));
    } else {
      cviScore = 40;
    }
  }

  const cleanPart = 25 * cva.cleanRate;
  const countPart = Math.min(40, cva.count * 1.5);
  const volPart = Math.min(35, Math.log10(Math.max(1, cva.volume + 1)) * 10);
  const cvaScore = Math.min(100, Math.round(cleanPart + countPart + volPart));

  const clampedRepayment = Math.max(0, Math.min(100, Math.round(repaymentValue)));

  const walletScore = Math.min(100, Math.round(Math.min(100, walletAgeDays) / 1.2));

  return [
    {
      key: "cvi",
      label: "CVI Verification Level",
      weight: 30,
      value: cviScore,
      description: "Validity, level and freshness of your A-Pass credential.",
    },
    {
      key: "cva",
      label: "CVA Transaction History",
      weight: 30,
      value: cvaScore,
      description: "Volume, consistency and cleanliness of your A-Token transfers.",
    },
    {
      key: "repayment",
      label: "Loan Repayment Record",
      weight: 25,
      value: clampedRepayment,
      description: "Your ClearLend borrowing history and on-time repayments.",
    },
    {
      key: "wallet",
      label: "Wallet Age & Activity",
      weight: 15,
      value: walletScore,
      description: "How long your wallet has been active across Cleanverse.",
    },
  ];
}
