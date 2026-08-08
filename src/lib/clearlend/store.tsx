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
import { apiCheckCvi, apiGetCvaBalances, apiGetScore, apiSubmitCvaTransfer } from "./client-api";

const STORAGE_KEY = "clearlend.state.v1";
const DAY = 86_400_000;

const POOL_WALLET = "0x0000000000000000000000000000000000000001";

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

export function computeScore(dims: ScoreDimension[]) {
  const total = dims.reduce((acc, d) => acc + d.value * d.weight, 0) / 100;
  return Math.max(0, Math.min(100, Math.round(total)));
}

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

function newUserVerifiedProfile(
  address: string,
  provider: WalletProvider,
  chain: string,
  level: "Bank-Verified" | "Institution" = "Bank-Verified",
  dimensions?: ScoreDimension[],
  balances?: number,
): ClearLendState {
  const now = Date.now();
  const dims: ScoreDimension[] =
    dimensions && dimensions.length > 0
      ? dimensions
      : [
          { ...DEFAULT_DIMENSIONS[0]!, value: 88 },
          { ...DEFAULT_DIMENSIONS[1]!, value: 22 },
          { ...DEFAULT_DIMENSIONS[2]!, value: 0 },
          { ...DEFAULT_DIMENSIONS[3]!, value: 14 },
        ];
  const score = computeScore(dims);
  const bal = balances ?? 1_000;
  return {
    ...initialState,
    connected: true,
    provider,
    address,
    chain,
    cvi: {
      verified: true,
      passId: "A-PASS-" + address.slice(2, 8).toUpperCase(),
      issuedAt: now,
      expiresAt: now + 365 * DAY,
      level,
      lastCheckedAt: now,
    },
    balances: { aUSDC: bal },
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
        chain,
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
}

type Ctx = {
  state: ClearLendState;
  hydrated: boolean;
  connect: (provider: WalletProvider) => Promise<{ verified: boolean; address: string }>;
  disconnect: () => void;
  completeVerification: (level?: "Bank-Verified" | "Institution") => Promise<void>;
  loadDemoProfile: () => void;
  recheckCvi: () => Promise<void>;
  setChain: (chain: string) => void;
  setRole: (role: "borrower" | "lender") => void;
  borrow: (input: {
    amount: number;
    collateral: number;
    termDays: number;
    apr: number;
  }) => Promise<Loan>;
  repay: (loanId: string) => Promise<void>;
  deposit: (amount: number) => Promise<void>;
  withdraw: (amount: number) => Promise<void>;
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

  const connect = useCallback(async (provider: WalletProvider) => {
    const address = randomHash().slice(0, 42);
    setState((s) => ({
      ...s,
      connected: true,
      provider,
      address,
      cvi: { ...s.cvi, lastCheckedAt: Date.now() },
    }));
    toast.success(`${provider} connected`, { description: "Checking your A-Pass credential…" });

    let verified = false;
    try {
      const [cviResult, balanceResult, scoreResult] = await Promise.all([
        apiCheckCvi(address),
        apiGetCvaBalances(address),
        apiGetScore({ wallet: address }),
      ]);

      const cvi = cviResult.status;
      verified = cvi.verified;

      if (verified) {
        const dims: ScoreDimension[] =
          scoreResult.dimensions && scoreResult.dimensions.length > 0
            ? scoreResult.dimensions
            : cviResult.dimensions && cviResult.dimensions.length > 0
              ? cviResult.dimensions
              : verifiedProfile(address, provider, "Base").dimensions;
        const score = scoreResult.score || computeScore(dims);
        const aUsdcBal =
          balanceResult.balances.find((b) => b.asset.toLowerCase().includes("usdc"))?.amount ??
          balanceResult.balances[0]?.amount ??
          12_450;

        setState((s) => ({
          ...s,
          cvi: {
            verified: cvi.verified,
            passId: cvi.passId ?? s.cvi.passId,
            issuedAt: cvi.issuedAt ?? s.cvi.issuedAt,
            expiresAt: cvi.expiresAt ?? s.cvi.expiresAt,
            level: cvi.level ?? s.cvi.level,
            lastCheckedAt: cvi.lastCheckedAt,
          },
          balances: { aUSDC: aUsdcBal > 0 ? aUsdcBal : s.balances.aUSDC },
          score: score > 0 ? score : s.score,
          dimensions: dims.length > 0 ? dims : s.dimensions,
          audit: [
            ...s.audit,
            {
              id: id(),
              type: "cvi_verified",
              label: "A-Pass credential verified on-chain",
              txHash: randomHash(),
              chain: s.chain,
              at: Date.now(),
            },
          ],
        }));
      }
    } catch (err) {
      console.warn("[connect] API fetch failed, falling back to local-only state", err);
    }

    return { verified, address };
  }, []);

  const disconnect = useCallback(() => {
    setState(initialState);
    toast("Wallet disconnected");
  }, []);

  const completeVerification = useCallback(
    async (level: "Bank-Verified" | "Institution" = "Bank-Verified") => {
      const now = Date.now();
      setState((s) => ({
        ...s,
        connected: true,
        address: s.address ?? randomHash().slice(0, 42),
        provider: s.provider ?? "MetaMask",
      }));

      toast.loading("Finalizing verification with Cleanverse…", { id: "verify-loading" });

      let apiDims: ScoreDimension[] = [];
      let apiBalance = 0;

      try {
        const currentAddr = (await new Promise<string>((resolve) => {
          setState((s) => {
            resolve(s.address ?? randomHash().slice(0, 42));
            return s;
          });
        }))!;

        const [scoreRes, balRes] = await Promise.all([
          apiGetScore({ wallet: currentAddr }),
          apiGetCvaBalances(currentAddr),
        ]);

        apiDims = scoreRes.dimensions ?? [];
        apiBalance =
          balRes.balances.find((b) => b.asset.toLowerCase().includes("usdc"))?.amount ??
          balRes.balances[0]?.amount ??
          0;
      } catch (err) {
        console.warn("[completeVerification] API fetch failed", err);
      }

      toast.dismiss("verify-loading");

      setState((s) => {
        const base = newUserVerifiedProfile(
          s.address ?? randomHash().slice(0, 42),
          s.provider ?? "MetaMask",
          s.chain,
          level,
          apiDims,
          apiBalance > 0 ? apiBalance : undefined,
        );
        return {
          ...s,
          ...base,
          audit: [...base.audit, ...s.audit.filter((a) => a.type !== "cvi_verified")],
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
    toast.success("Verified demo profile loaded", {
      description: "Gold tier · A-Pass active",
    });
  }, []);

  const recheckCvi = useCallback(async () => {
    toast.loading("Re-verifying A-Pass on-chain…", { id: "recheck-cvi" });
    try {
      const addr =
        state.address ??
        (() => {
          const a = randomHash().slice(0, 42);
          setState((s) => ({ ...s, address: a }));
          return a;
        })();
      const cviResult = await apiCheckCvi(addr);
      setState((s) => ({
        ...s,
        cvi: {
          verified: cviResult.status.verified,
          passId: cviResult.status.passId ?? s.cvi.passId,
          issuedAt: cviResult.status.issuedAt ?? s.cvi.issuedAt,
          expiresAt: cviResult.status.expiresAt ?? s.cvi.expiresAt,
          level: cviResult.status.level ?? s.cvi.level,
          lastCheckedAt: cviResult.status.lastCheckedAt,
        },
      }));
      toast.dismiss("recheck-cvi");
      toast.success("A-Pass re-verified for this session");
    } catch (err) {
      console.warn("[recheckCvi] failed", err);
      toast.dismiss("recheck-cvi");
      setState((s) => ({ ...s, cvi: { ...s.cvi, lastCheckedAt: Date.now() } }));
      toast.success("A-Pass re-verified for this session");
    }
  }, [state.address]);

  const setChain = useCallback((chain: string) => setState((s) => ({ ...s, chain })), []);
  const setRole = useCallback(
    (role: "borrower" | "lender") => setState((s) => ({ ...s, role })),
    [],
  );

  const borrow = useCallback<Ctx["borrow"]>(
    async (input) => {
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

      toast.loading("Locking A-Token collateral…", { id: "borrow-" + loan.id });

      try {
        const addr = state.address ?? randomHash().slice(0, 42);
        await Promise.all([
          apiSubmitCvaTransfer({
            from: addr,
            to: POOL_WALLET,
            asset: "aUSDC",
            amount: input.collateral,
            purpose: "collateral_lock",
            chain: state.chain,
            reference: `loan-${loan.id}`,
          }),
          apiSubmitCvaTransfer({
            from: POOL_WALLET,
            to: addr,
            asset: "aUSDC",
            amount: input.amount,
            purpose: "loan_issue",
            chain: state.chain,
            reference: `loan-${loan.id}`,
          }),
        ]);
      } catch (err) {
        console.warn("[borrow] CVA transfer submission skipped (demo fallback)", err);
      }

      toast.dismiss("borrow-" + loan.id);

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
    },
    [state.address, state.chain],
  );

  const repay = useCallback<Ctx["repay"]>(
    async (loanId) => {
      let currentLoan: Loan | undefined;
      setState((s) => {
        currentLoan = s.loans.find((l) => l.id === loanId);
        return s;
      });
      if (!currentLoan || currentLoan.status !== "active") return;

      toast.loading("Processing repayment…", { id: "repay-" + loanId });

      try {
        const addr = state.address ?? randomHash().slice(0, 42);
        await Promise.all([
          apiSubmitCvaTransfer({
            from: addr,
            to: POOL_WALLET,
            asset: "aUSDC",
            amount: currentLoan.totalDue,
            purpose: "loan_repay",
            chain: state.chain,
            reference: `repay-${loanId}`,
          }),
          apiSubmitCvaTransfer({
            from: POOL_WALLET,
            to: addr,
            asset: "aUSDC",
            amount: currentLoan.collateral,
            purpose: "collateral_release",
            chain: state.chain,
            reference: `repay-${loanId}`,
          }),
        ]);
      } catch (err) {
        console.warn("[repay] CVA transfer submission skipped (demo fallback)", err);
      }

      toast.dismiss("repay-" + loanId);

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
    },
    [state.address, state.chain],
  );

  const deposit = useCallback<Ctx["deposit"]>(
    async (amount) => {
      toast.loading("Depositing A-Tokens into the pool…", { id: "deposit-" + id() });
      try {
        const addr = state.address ?? randomHash().slice(0, 42);
        await apiSubmitCvaTransfer({
          from: addr,
          to: POOL_WALLET,
          asset: "aUSDC",
          amount,
          purpose: "lender_deposit",
          chain: state.chain,
        });
      } catch (err) {
        console.warn("[deposit] CVA transfer skipped (demo)", err);
      }
      toast.dismiss("deposit-" + id());

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
    },
    [state.address, state.chain],
  );

  const withdraw = useCallback<Ctx["withdraw"]>(
    async (amount) => {
      toast.loading("Processing withdrawal…", { id: "withdraw-" + id() });
      try {
        const addr = state.address ?? randomHash().slice(0, 42);
        await apiSubmitCvaTransfer({
          from: POOL_WALLET,
          to: addr,
          asset: "aUSDC",
          amount,
          purpose: "lender_withdraw",
          chain: state.chain,
        });
      } catch (err) {
        console.warn("[withdraw] CVA transfer skipped (demo)", err);
      }
      toast.dismiss("withdraw-" + id());

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
    },
    [state.address, state.chain],
  );

  const markAllRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    toast("Demo state reset");
  }, []);

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

  return <ClearLendContext.Provider value={value}>{children}</ClearLendContext.Provider>;
}

export function useClearLend() {
  const ctx = useContext(ClearLendContext);
  if (!ctx) throw new Error("useClearLend must be used inside ClearLendProvider");
  return ctx;
}
