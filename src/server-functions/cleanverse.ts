import {
  getCleanverseEnv,
  getCviStatus,
  createCviSession,
  getCvaBalances,
  getCvaHistory,
  submitCvaTransfer,
  collectScoreInputs,
  CviPassStatus,
  CvaBalance,
  CvaTransaction,
  CvaTransferResult,
} from "@/lib/clearlend/api";
import type { ScoreDimension } from "@/lib/clearlend/types";

class ServerFnError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ServerFnError";
  }
}

function validateWallet(wallet: string): string {
  if (!wallet || typeof wallet !== "string") {
    throw new ServerFnError("Wallet address is required", 400);
  }
  const trimmed = wallet.trim();
  if (!trimmed.startsWith("0x") || trimmed.length < 40) {
    throw new ServerFnError(
      "Invalid wallet address: must start with 0x and be at least 40 characters",
      400,
    );
  }
  return trimmed.toLowerCase();
}

function deterministicWalletAgeDays(wallet: string): number {
  let hash = 0;
  for (let i = 2; i < wallet.length; i++) {
    hash = (hash * 31 + wallet.charCodeAt(i)) >>> 0;
  }
  return 30 + (hash % 720);
}

export type CheckCviResult = {
  status: CviPassStatus;
  dimensions: ScoreDimension[];
};

export async function checkCvi(wallet: string): Promise<CheckCviResult> {
  const validWallet = validateWallet(wallet);
  const env = getCleanverseEnv();
  const [status, dimensions] = await Promise.all([
    getCviStatus(env, validWallet),
    collectScoreInputs(env, validWallet, 50, deterministicWalletAgeDays(validWallet)),
  ]);
  return { status, dimensions };
}

export type CreateVerificationSessionInput = {
  wallet: string;
  redirectUrl: string;
  accountType?: "individual" | "institution";
  country?: string;
};

export async function createVerificationSession(
  input: CreateVerificationSessionInput,
): Promise<{ sessionId: string; redirectUrl: string }> {
  const validWallet = validateWallet(input.wallet);
  if (!input.redirectUrl || typeof input.redirectUrl !== "string") {
    throw new ServerFnError("Redirect URL is required", 400);
  }
  const env = getCleanverseEnv();
  const sessionParams: Parameters<typeof createCviSession>[1] = {
    wallet: validWallet,
    redirectUrl: input.redirectUrl,
  };
  if (input.accountType !== undefined) sessionParams.accountType = input.accountType;
  if (input.country !== undefined) sessionParams.country = input.country;
  return createCviSession(env, sessionParams);
}

export async function fetchCvaBalances(wallet: string): Promise<CvaBalance[]> {
  const validWallet = validateWallet(wallet);
  const env = getCleanverseEnv();
  return getCvaBalances(env, validWallet);
}

export type CvaHistoryResult = {
  transfers: CvaTransaction[];
  volume: number;
  cleanRate: number;
  count: number;
  windowDays: number;
};

export async function fetchCvaHistory(wallet: string): Promise<CvaHistoryResult> {
  const validWallet = validateWallet(wallet);
  const env = getCleanverseEnv();
  return getCvaHistory(env, validWallet);
}

export type SubmitTransferInput = {
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
};

export async function submitTransfer(input: SubmitTransferInput): Promise<CvaTransferResult> {
  const from = validateWallet(input.from);
  const to = validateWallet(input.to);
  if (!input.asset || typeof input.asset !== "string") {
    throw new ServerFnError("Asset is required", 400);
  }
  if (typeof input.amount !== "number" || isNaN(input.amount) || input.amount <= 0) {
    throw new ServerFnError("Valid positive amount is required", 400);
  }
  const env = getCleanverseEnv();
  const transferParams: Parameters<typeof submitCvaTransfer>[1] = {
    from,
    to,
    asset: input.asset,
    amount: input.amount,
    purpose: input.purpose,
    chain: input.chain ?? "Base",
  };
  if (input.reference !== undefined) transferParams.reference = input.reference;
  return submitCvaTransfer(env, transferParams);
}
