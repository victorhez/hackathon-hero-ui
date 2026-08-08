import type {
  CviPassStatus,
  CvaBalance,
  CvaTransaction,
  CvaTransferResult,
  ScoreDimension,
} from "./types";

const API_BASE = "/api/cleanverse";

const FETCH_TIMEOUT_MS = 6000;

async function request<T>(path: string, init: RequestInit = {}, fallback: T): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
      signal: init.signal ?? controller.signal,
    });
    if (!res.ok) {
      try {
        const err = await res.json();
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      } catch {
        return fallback;
      }
    }
    const json = (await res.json()) as T;
    return json ?? fallback;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(
        "[clearlend-api]",
        path,
        `timed out after ${FETCH_TIMEOUT_MS}ms — using fallback`,
      );
    } else {
      console.warn("[clearlend-api]", path, err);
    }
    return fallback;
  } finally {
    clearTimeout(timeoutId);
  }
}

export type CheckCviResponse = {
  status: CviPassStatus;
  dimensions: ScoreDimension[];
};

export async function apiCheckCvi(wallet: string): Promise<CheckCviResponse> {
  const fallback: CheckCviResponse = {
    status: {
      verified: false,
      passId: null,
      issuedAt: null,
      expiresAt: null,
      level: null,
      wallet,
      country: null,
      lastCheckedAt: Date.now(),
    },
    dimensions: [],
  };
  return request(`/cvi-check`, { method: "POST", body: JSON.stringify({ wallet }) }, fallback);
}

export type CviSessionResponse = {
  sessionId: string;
  redirectUrl: string;
};

export async function apiCreateCviSession(input: {
  wallet: string;
  redirectUrl: string;
  accountType?: "individual" | "institution";
  country?: string;
}): Promise<CviSessionResponse> {
  const fallback: CviSessionResponse = {
    sessionId: `sess_demo_${Math.random().toString(36).slice(2, 10)}`,
    redirectUrl: `${input.redirectUrl}?demo=cvi`,
  };
  return request(`/cvi-session`, { method: "POST", body: JSON.stringify(input) }, fallback);
}

export type CvaBalancesResponse = { balances: CvaBalance[] };

export async function apiGetCvaBalances(wallet: string): Promise<CvaBalancesResponse> {
  const fallback: CvaBalancesResponse = {
    balances: [{ asset: "aUSDC", amount: 0, lastUpdatedAt: Date.now() }],
  };
  return request(`/cva-balances`, { method: "POST", body: JSON.stringify({ wallet }) }, fallback);
}

export type CvaHistoryResponse = {
  transfers: CvaTransaction[];
  volume: number;
  cleanRate: number;
  count: number;
  windowDays: number;
};

export async function apiGetCvaHistory(wallet: string): Promise<CvaHistoryResponse> {
  const fallback: CvaHistoryResponse = {
    transfers: [],
    volume: 0,
    cleanRate: 1,
    count: 0,
    windowDays: 180,
  };
  return request(`/cva-history`, { method: "POST", body: JSON.stringify({ wallet }) }, fallback);
}

export async function apiSubmitCvaTransfer(input: {
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
}): Promise<CvaTransferResult> {
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
  return request(`/cva-transfer`, { method: "POST", body: JSON.stringify(input) }, fallback);
}

export type ScoreResponse = {
  dimensions: ScoreDimension[];
  score: number;
  walletAgeDays: number;
};

export async function apiGetScore(input: {
  wallet: string;
  repaymentValue?: number;
  walletAgeDays?: number;
}): Promise<ScoreResponse> {
  const fallback: ScoreResponse = {
    dimensions: [],
    score: 0,
    walletAgeDays: 0,
  };
  return request(`/score`, { method: "POST", body: JSON.stringify(input) }, fallback);
}
