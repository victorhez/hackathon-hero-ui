export type TierName = "Platinum" | "Gold" | "Silver" | "Bronze" | "Unranked";

export type Tier = {
  name: TierName;
  min: number;
  max: number;
  collateralRatio: number; // fraction of loan amount required as collateral
  collateralLabel: string;
  limit: number;
  apr: number; // borrower interest, annualised %
  rateLabel: string;
  colorVar: string;
};

export const TIERS: Tier[] = [
  {
    name: "Platinum",
    min: 85,
    max: 100,
    collateralRatio: 0.15,
    collateralLabel: "0% – 20%",
    limit: 50000,
    apr: 4.2,
    rateLabel: "Lowest (Prime)",
    colorVar: "platinum",
  },
  {
    name: "Gold",
    min: 65,
    max: 84,
    collateralRatio: 0.32,
    collateralLabel: "25% – 40%",
    limit: 20000,
    apr: 6.8,
    rateLabel: "Competitive",
    colorVar: "gold",
  },
  {
    name: "Silver",
    min: 45,
    max: 64,
    collateralRatio: 0.6,
    collateralLabel: "50% – 70%",
    limit: 10000,
    apr: 9.5,
    rateLabel: "Standard",
    colorVar: "silver",
  },
  {
    name: "Bronze",
    min: 20,
    max: 44,
    collateralRatio: 0.9,
    collateralLabel: "80% – 100%",
    limit: 2000,
    apr: 13.4,
    rateLabel: "Higher",
    colorVar: "bronze",
  },
  {
    name: "Unranked",
    min: 0,
    max: 19,
    collateralRatio: 1.25,
    collateralLabel: "120%+",
    limit: 250,
    apr: 18.9,
    rateLabel: "Maximum",
    colorVar: "unranked",
  },
];

export function tierForScore(score: number): Tier {
  return TIERS.find((t) => score >= t.min && score <= t.max) ?? TIERS[TIERS.length - 1]!;
}

export function nextTier(score: number): Tier | null {
  const idx = TIERS.findIndex((t) => t.name === tierForScore(score).name);
  return idx > 0 ? TIERS[idx - 1]! : null;
}

export type ScoreDimension = {
  key: "cvi" | "cva" | "repayment" | "wallet";
  label: string;
  weight: number;
  value: number; // 0-100 sub-score
  description: string;
};

export type Loan = {
  id: string;
  amount: number;
  collateral: number;
  termDays: number;
  apr: number;
  interest: number;
  totalDue: number;
  tier: TierName;
  startedAt: number;
  dueAt: number;
  status: "active" | "repaid" | "defaulted";
  repaidAt?: number;
  chain: string;
};

export type AuditEvent = {
  id: string;
  type:
    | "loan_issued"
    | "loan_repaid"
    | "collateral_locked"
    | "collateral_released"
    | "lender_deposit"
    | "lender_withdraw"
    | "score_update"
    | "cvi_verified"
    | "yield_accrued";
  label: string;
  amount?: number;
  txHash: string;
  chain: string;
  at: number;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  kind: "info" | "success" | "warning";
  at: number;
  read: boolean;
};

export type LenderPosition = {
  deposited: number;
  earned: number;
  since: number | null;
};

export type ScorePoint = { label: string; score: number };

export type WalletProvider = "MetaMask" | "WalletConnect" | "Coinbase Wallet";

export type ClearLendState = {
  connected: boolean;
  provider: WalletProvider | null;
  address: string | null;
  chain: string;
  cvi: {
    verified: boolean;
    passId: string | null;
    issuedAt: number | null;
    expiresAt: number | null;
    level: "Bank-Verified" | "Institution" | null;
    lastCheckedAt: number | null;
  };
  balances: { aUSDC: number };
  score: number;
  dimensions: ScoreDimension[];
  scoreHistory: ScorePoint[];
  loans: Loan[];
  lender: LenderPosition;
  audit: AuditEvent[];
  notifications: Notification[];
  onboarded: boolean;
  role: "borrower" | "lender";
};

export const CHAINS = ["Base", "Monad", "Ethereum", "Arbitrum", "BNB Chain"] as const;

export const POOL = {
  totalLiquidity: 4_820_000,
  borrowed: 3_180_000,
  lenderApy: 8.4,
  minDeposit: 25,
  verifiedLenders: 1284,
  loansIssued: 5_612,
  defaultRate: 0.7,
};

export const poolUtilisation = (extraDeposit = 0) =>
  (POOL.borrowed / (POOL.totalLiquidity + extraDeposit)) * 100;

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
