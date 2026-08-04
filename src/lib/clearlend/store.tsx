import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type AuditEvent,
  type ClearLendState,
  type Loan,
  type Notification,
  type ScoreDimension,
  type WalletProvider,
  POOL,
  tierForScore,
} from "./types";

const STORAGE_KEY = "clearlend.state.v1";
const DAY = 86_400_000;

const randomHash = () =>
  "0x" +
  Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

const id = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_DIMENSIONS: ScoreDimension[] = [
  {
    key: "cvi",
    label: "CVI Verification Level",
    weight: 30,
    value: 0,
    description: "Validity, level and freshness of your A-Pass credential.",
  },
  {
    key: "cva",
    label: "CVA Transaction History",
    weight: 30,
    value: 0,
    description: "Volume, consistency and cleanliness of your A-Token transfers.",
  },
  {
    key: "repayment",
    label: "Loan Repayment Record",
    weight: 25,
    value: 0,
    description: "Your ClearLend borrowing history and on-time repayments.",
  },
  {
    key: "wallet",
    label: "Wallet Age & Activity",
    weight: 15,
    value: 0,
    description: "How long your wallet has been active across Cleanverse.",
  },
];

const initialState: ClearLendState = {
  connected: false,
  provider: null,
  address: null,
  chain: "Base",
  cvi: {
    verified: false,
    passId: null,
    issuedAt: null,
    expiresAt: null,
    level: null,
    lastCheckedAt: null,
  },
  balances: { aUSDC: 0 },
  score: 0,
  dimensions: DEFAULT_DIMENSIONS,
  scoreHistory: [],
  loans: [],
  lender: { deposited: 0, earned: 0, since: null },
  audit: [],
  notifications: [],
  onboarded: false,
  role: "borrower",
};

/** A verified demo profile — what a returning Gold-tier user looks like. */
function verifiedProfile(
  address: string,
  provider: WalletProvider,
  chain: string,
  level: "Bank-Verified" | "Institution" = "Bank-Verified",
): ClearLendState {
  const now = Date.now();
  const dims: ScoreDimension[] = [
    { ...DEFAULT_DIMENSIONS[0]!, value: 92 },
    { ...DEFAULT_DIMENSIONS[1]!, value: 74 },
    { ...DEFAULT_DIMENSIONS[2]!, value: 68 },
    { ...DEFAULT_DIMENSIONS[3]!, value: 61 },
  ];
  return {
    ...initialState,
    connected: true,
    provider,
    address,
    chain,
    cvi: {
      verified: true,
      passId: "A-PASS-" + address.slice(2, 8).toUpperCase(),
      issuedAt: now - 118 * DAY,
      expiresAt: now + 247 * DAY,
      level,
      lastCheckedAt: now,
    },
    balances: { aUSDC: 12_450 },
    score: computeScore(dims),
    dimensions: dims,
    scoreHistory: [
      { label: "Mar", score: 41 },
      { label: "Apr", score: 48 },
      { label: "May", score: 55 },
      { label: "Jun", score: 62 },
      { label: "Jul", score: 69 },
      { label: "Aug", score: computeScore(dims) },
    ],
    loans: [],
    lender: { deposited: 0, earned: 0, since: null },
    onboarded: true,
    audit: [
      {
        id: id(),
        type: "cvi_verified",
        label: "A-Pass credential verified on-chain",
        txHash: randomHash(),
        chain,
        at: now,
      },
    ],
    notifications: [
      {
        id: id(),
        title: "Welcome back",
        body: "Your A-Pass is active and your Reputation Score is up 7 points this month.",
        kind: "success",
        at: now,
        read: false,
      },
    ],
  };
}

export function computeScore(dims: ScoreDimension[]) {
  const total = dims.reduce((acc, d) => acc + d.value * d.weight, 0) / 100;
  return Math.max(0, Math.min(100, Math.round(total)));
}

type Ctx = {
  state: ClearLendState;
  hydrated: boolean;
  connect: (provider: WalletProvider) => void;
  disconnect: () => void;
  completeVerification: (level?: "Bank-Verified" | "Institution") => void;
  loadDemoProfile: () => void;
  recheckCvi: () => void;
  setChain: (chain: string) => void;
  setRole: (role: "borrower" | "lender") => void;
  borrow: (input: { amount: number; collateral: number; termDays: number; apr: number }) => Loan;
  repay: (loanId: string) => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => void;
  markAllRead: () => void;
  reset: () => void;
};

const ClearLendContext = createContext<Ctx | null>(null);

export function ClearLendProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ClearLendState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...(JSON.parse(raw) as ClearLendState) });
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state, hydrated]);

  const pushAudit = useCallback((event: Omit<AuditEvent, "id" | "txHash" | "at" | "chain">) => {
    setState((s) => ({
      ...s,
      audit: [
        { ...event, id: id(), txHash: randomHash(), chain: s.chain, at: Date.now() },
        ...s.audit,
      ],
    }));
  }, []);

  const notify = useCallback((n: Omit<Notification, "id" | "at" | "read">) => {
    setState((s) => ({
      ...s,
      notifications: [{ ...n, id: id(), at: Date.now(), read: false }, ...s.notifications],
    }));
  }, []);

  const connect = useCallback((provider: WalletProvider) => {
    const address = randomHash().slice(0, 42);
    setState((s) => ({
      ...s,
      connected: true,
      provider,
      address,
      cvi: { ...s.cvi, lastCheckedAt: Date.now() },
    }));
    toast.success(`${provider} connected`, { description: "Checking your A-Pass credential…" });
  }, []);

  const disconnect = useCallback(() => {
    setState(initialState);
    toast("Wallet disconnected");
  }, []);

  const completeVerification = useCallback(
    (level: "Bank-Verified" | "Institution" = "Bank-Verified") => {
      setState((s) => {
        const now = Date.now();
        const dims: ScoreDimension[] = [
          { ...DEFAULT_DIMENSIONS[0]!, value: 88 },
          { ...DEFAULT_DIMENSIONS[1]!, value: 22 },
          { ...DEFAULT_DIMENSIONS[2]!, value: 0 },
          { ...DEFAULT_DIMENSIONS[3]!, value: 14 },
        ];
        const score = computeScore(dims);
        return {
          ...s,
          connected: true,
          address: s.address ?? randomHash().slice(0, 42),
          provider: s.provider ?? "MetaMask",
          cvi: {
            verified: true,
            passId: "A-PASS-" + (s.address ?? randomHash()).slice(2, 8).toUpperCase(),
            issuedAt: now,
            expiresAt: now + 365 * DAY,
            level,
            lastCheckedAt: now,
          },
          balances: { aUSDC: 1_000 },
          score,
          dimensions: dims,
          scoreHistory: [{ label: "Today", score }],
          onboarded: true,
          audit: [
            {
              id: id(),
              type: "cvi_verified",
              label: "A-Pass issued and bound to wallet",
              txHash: randomHash(),
              chain: s.chain,
              at: now,
            },
          ],
          notifications: [
            {
              id: id(),
              title: "A-Pass active",
              body: `You're verified. Starting score ${score} — ${tierForScore(score).name} tier.`,
              kind: "success",
              at: now,
              read: false,
            },
          ],
        };
      });
      toast.success("A-Pass verified", { description: "Welcome to ClearLend." });
    },
    [],
  );

  const loadDemoProfile = useCallback(() => {
    setState((s) =>
      verifiedProfile(s.address ?? randomHash().slice(0, 42), s.provider ?? "MetaMask", s.chain),
    );
    toast.success("Verified demo profile loaded", { description: "Gold tier · A-Pass active" });
  }, []);

  const recheckCvi = useCallback(() => {
    setState((s) => ({ ...s, cvi: { ...s.cvi, lastCheckedAt: Date.now() } }));
    toast.success("A-Pass re-verified for this session");
  }, []);

  const setChain = useCallback((chain: string) => setState((s) => ({ ...s, chain })), []);
  const setRole = useCallback(
    (role: "borrower" | "lender") => setState((s) => ({ ...s, role })),
    [],
  );

  const borrow = useCallback<Ctx["borrow"]>((input) => {
    const now = Date.now();
    const interest = (input.amount * (input.apr / 100) * input.termDays) / 365;
    const loan: Loan = {
      id: id(),
      amount: input.amount,
      collateral: input.collateral,
      termDays: input.termDays,
      apr: input.apr,
      interest,
      totalDue: input.amount + interest,
      tier: tierForScore(0).name,
      startedAt: now,
      dueAt: now + input.termDays * DAY,
      status: "active",
      chain: "Base",
    };
    setState((s) => {
      loan.tier = tierForScore(s.score).name;
      loan.chain = s.chain;
      return {
        ...s,
        balances: { aUSDC: s.balances.aUSDC + input.amount - input.collateral },
        loans: [loan, ...s.loans],
        audit: [
          {
            id: id(),
            type: "collateral_locked",
            label: "Collateral locked in vault contract",
            amount: input.collateral,
            txHash: randomHash(),
            chain: s.chain,
            at: now,
          },
          {
            id: id(),
            type: "loan_issued",
            label: `Loan disbursed in A-Tokens · ${input.termDays}d term`,
            amount: input.amount,
            txHash: randomHash(),
            chain: s.chain,
            at: now + 1,
          },
          ...s.audit,
        ],
        notifications: [
          {
            id: id(),
            title: "Loan active",
            body: `${input.amount.toLocaleString()} aUSDC disbursed. Repay by ${new Date(loan.dueAt).toLocaleDateString()}.`,
            kind: "info",
            at: now,
            read: false,
          },
          ...s.notifications,
        ],
      };
    });
    toast.success("Loan issued", { description: "A-Token collateral locked on-chain." });
    return loan;
  }, []);

  const repay = useCallback<Ctx["repay"]>((loanId) => {
    setState((s) => {
      const loan = s.loans.find((l) => l.id === loanId);
      if (!loan || loan.status !== "active") return s;
      const now = Date.now();
      const onTime = now <= loan.dueAt;
      const gained = onTime ? 8 : -12;
      const dims = s.dimensions.map((d) =>
        d.key === "repayment"
          ? { ...d, value: Math.max(0, Math.min(100, d.value + (onTime ? 14 : -20))) }
          : d.key === "cva"
            ? { ...d, value: Math.min(100, d.value + (onTime ? 4 : 0)) }
            : d,
      );
      const score = computeScore(dims);
      const newTier = tierForScore(score).name;
      const oldTier = tierForScore(s.score).name;
      const notes: Notification[] = [
        {
          id: id(),
          title: onTime ? "Repayment confirmed" : "Late repayment recorded",
          body: onTime
            ? `Collateral released. Reputation Score ${gained > 0 ? "+" : ""}${gained} points.`
            : "Your score dropped. Repay early next time to recover points.",
          kind: onTime ? "success" : "warning",
          at: now,
          read: false,
        },
      ];
      if (newTier !== oldTier) {
        notes.unshift({
          id: id(),
          title: `Tier updated — ${newTier}`,
          body: `You're now ${newTier}. Your next loan uses ${newTier} collateral and rates.`,
          kind: "success",
          at: now,
          read: false,
        });
      }
      return {
        ...s,
        balances: { aUSDC: s.balances.aUSDC - loan.totalDue + loan.collateral },
        loans: s.loans.map((l) =>
          l.id === loanId ? { ...l, status: "repaid" as const, repaidAt: now } : l,
        ),
        dimensions: dims,
        score,
        scoreHistory: [...s.scoreHistory, { label: "Now", score }].slice(-12),
        audit: [
          {
            id: id(),
            type: "collateral_released",
            label: "Collateral released from vault",
            amount: loan.collateral,
            txHash: randomHash(),
            chain: s.chain,
            at: now + 1,
          },
          {
            id: id(),
            type: "loan_repaid",
            label: `Repayment settled in A-Tokens${onTime ? " (on time)" : " (late)"}`,
            amount: loan.totalDue,
            txHash: randomHash(),
            chain: s.chain,
            at: now,
          },
          ...s.audit,
        ],
        notifications: [...notes, ...s.notifications],
      };
    });
    toast.success("Loan repaid", { description: "Collateral released automatically." });
  }, []);

  const deposit = useCallback<Ctx["deposit"]>((amount) => {
    setState((s) => {
      const now = Date.now();
      return {
        ...s,
        balances: { aUSDC: s.balances.aUSDC - amount },
        lender: {
          deposited: s.lender.deposited + amount,
          earned: s.lender.earned,
          since: s.lender.since ?? now,
        },
        audit: [
          {
            id: id(),
            type: "lender_deposit",
            label: "A-Tokens deposited into lending pool",
            amount,
            txHash: randomHash(),
            chain: s.chain,
            at: now,
          },
          ...s.audit,
        ],
        notifications: [
          {
            id: id(),
            title: "Deposit confirmed",
            body: `${amount.toLocaleString()} aUSDC now earning ${POOL.lenderApy}% APY.`,
            kind: "success",
            at: now,
            read: false,
          },
          ...s.notifications,
        ],
      };
    });
    toast.success("Deposit confirmed");
  }, []);

  const withdraw = useCallback<Ctx["withdraw"]>((amount) => {
    setState((s) => {
      const now = Date.now();
      const capped = Math.min(amount, s.lender.deposited + s.lender.earned);
      const fromEarned = Math.min(capped, s.lender.earned);
      return {
        ...s,
        balances: { aUSDC: s.balances.aUSDC + capped },
        lender: {
          deposited: s.lender.deposited - (capped - fromEarned),
          earned: s.lender.earned - fromEarned,
          since: s.lender.since,
        },
        audit: [
          {
            id: id(),
            type: "lender_withdraw",
            label: "Withdrawal from lending pool",
            amount: capped,
            txHash: randomHash(),
            chain: s.chain,
            at: now,
          },
          ...s.audit,
        ],
      };
    });
    toast.success("Withdrawal complete");
  }, []);

  const markAllRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    toast("Demo state reset");
  }, []);

  /** Simulated lender yield accrual so the pool feels alive during a demo. */
  useEffect(() => {
    if (!state.lender.deposited) return;
    const t = setInterval(() => {
      setState((s) => ({
        ...s,
        lender: {
          ...s.lender,
          earned: s.lender.earned + (s.lender.deposited * (POOL.lenderApy / 100)) / (365 * 24 * 60),
        },
      }));
    }, 4000);
    return () => clearInterval(t);
  }, [state.lender.deposited]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      hydrated,
      connect,
      disconnect,
      completeVerification,
      loadDemoProfile,
      recheckCvi,
      setChain,
      setRole,
      borrow,
      repay,
      deposit,
      withdraw,
      markAllRead,
      reset,
    }),
    [
      state,
      hydrated,
      connect,
      disconnect,
      completeVerification,
      loadDemoProfile,
      recheckCvi,
      setChain,
      setRole,
      borrow,
      repay,
      deposit,
      withdraw,
      markAllRead,
      reset,
    ],
  );

  void pushAudit;
  void notify;

  return <ClearLendContext.Provider value={value}>{children}</ClearLendContext.Provider>;
}

export function useClearLend() {
  const ctx = useContext(ClearLendContext);
  if (!ctx) throw new Error("useClearLend must be used inside ClearLendProvider");
  return ctx;
}
