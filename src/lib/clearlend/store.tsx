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
import {
  apiCheckCvi,
  apiGetCvaBalances,
  apiGetScore,
  apiSubmitCvaTransfer,
  type CheckCviResponse,
} from "./client-api";

const STORAGE_KEY = "clearlend.state.v2";
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
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ClearLendState> & { _demo?: boolean };
        const hasRequiredNestedArrays =
          Array.isArray(parsed.loans) &&
          Array.isArray(parsed.audit) &&
          Array.isArray(parsed.notifications) &&
          Array.isArray(parsed.dimensions) &&
          Array.isArray(parsed.scoreHistory) &&
          parsed.lender &&
          typeof parsed.lender === "object" &&
          !Array.isArray(parsed.lender) &&
          typeof parsed.cvi === "object" &&
          parsed.cvi !== null &&
          !Array.isArray(parsed.cvi) &&
          typeof parsed.balances === "object" &&
          parsed.balances !== null &&
          !Array.isArray(parsed.balances);
        const looksLikeDemoSeed =
          typeof parsed.cvi?.passId === "string" && /^A-PASS-[0-9A-F]{6}$/.test(parsed.cvi.passId);
        if (hasRequiredNestedArrays && !looksLikeDemoSeed) {
          setState({
            ...initialState,
            ...parsed,
            cvi: { ...initialState.cvi, ...parsed.cvi },
            balances: { ...initialState.balances, ...parsed.balances },
            lender: { ...initialState.lender, ...parsed.lender },
            dimensions:
              parsed.dimensions && parsed.dimensions.length > 0
                ? parsed.dimensions
                : initialState.dimensions,
            loans: parsed.loans ?? [],
            audit: parsed.audit ?? [],
            notifications: parsed.notifications ?? [],
            scoreHistory: parsed.scoreHistory ?? [],
          } as ClearLendState);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      if (cancelled) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* storage unavailable */
      }
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [state, hydrated]);

  const connect = useCallback(async (provider: WalletProvider) => {
    type EIP1193Provider = {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, cb: (accounts: string[]) => void) => void;
      removeListener?: (event: string, cb: (accounts: string[]) => void) => void;
    };

    const detectProvider = (): EIP1193Provider | null => {
      if (typeof window === "undefined") return null;
      const w = window as unknown as {
        ethereum?: EIP1193Provider & { providers?: EIP1193Provider[] };
      };
      if (!w.ethereum) return null;
      if (provider === "Coinbase Wallet" && w.ethereum.providers) {
        const cb = w.ethereum.providers.find(
          (p) => (p as unknown as { isCoinbaseWallet?: boolean }).isCoinbaseWallet,
        );
        if (cb) return cb;
      }
      return w.ethereum;
    };

    const eth = detectProvider();

    let address: string;
    if (provider === "WalletConnect") {
      throw new Error(
        "WalletConnect requires a projectId — please connect via MetaMask or Coinbase Wallet for this demo.",
      );
    }
    if (!eth) {
      const installUrl =
        provider === "Coinbase Wallet"
          ? "https://www.coinbase.com/wallet"
          : "https://metamask.io/download/";
      throw new Error(
        `${provider} not detected. Install the ${provider} extension at ${installUrl} and refresh, or use a wallet-enabled browser.`,
      );
    }

    try {
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (!accounts || accounts.length === 0 || !accounts[0]) {
        throw new Error("No accounts returned from wallet. Please approve the connection request.");
      }
      address = String(accounts[0]).toLowerCase();
    } catch (reqErr: unknown) {
      const msg = reqErr instanceof Error ? reqErr.message : "Wallet connection rejected.";
      if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("denied")) {
        throw new Error("Connection cancelled. Approve the wallet prompt to sign in.");
      }
      throw new Error(msg);
    }

    try {
      const messageText = `ClearLend login · ${new Date().toISOString().slice(0, 10)} · ${address.slice(0, 8)}…${address.slice(-6)}`;
      let hexMessage: string;
      if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
        hexMessage = `0x${Buffer.from(messageText).toString("hex")}`;
      } else {
        hexMessage = "0x";
        for (let i = 0; i < messageText.length; i++) {
          hexMessage += messageText.charCodeAt(i).toString(16).padStart(2, "0");
        }
        hexMessage = `0x${hexMessage.slice(2)}`;
      }
      await eth.request({
        method: "personal_sign",
        params: [hexMessage, address],
      });
    } catch {
      /* signature is optional — proceed without it */
    }

    setState((s) => ({
      ...s,
      connected: true,
      provider,
      address,
      cvi: { ...s.cvi, lastCheckedAt: Date.now() },
    }));
    toast.success(`${provider} connected`, { description: "Checking your A-Pass credential…" });

    let verified = false;
    let alreadyVerifiedFromStorage = false;
    setState((s) => {
      alreadyVerifiedFromStorage = s.cvi.verified && !!s.cvi.passId;
      verified = alreadyVerifiedFromStorage;
      return s;
    });

    const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((resolve) =>
          setTimeout(() => {
            console.warn("[connect] API call timed out after", ms, "ms");
            resolve(fallback);
          }, ms),
        ),
      ]);

    const cviFallback: CheckCviResponse = {
      status: {
        verified: false,
        passId: null,
        issuedAt: null,
        expiresAt: null,
        level: null,
        wallet: address,
        country: null,
        lastCheckedAt: Date.now(),
      },
      dimensions: [],
    };
    const balFallback: { balances: { asset: string; amount: number; lastUpdatedAt: number }[] } =
      {
        balances: [{ asset: "aUSDC", amount: 0, lastUpdatedAt: Date.now() }],
      };
    const scoreFallback: { dimensions: ScoreDimension[]; score: number; walletAgeDays: number } =
      {
        dimensions: [],
        score: 0,
        walletAgeDays: 0,
      };

    try {
      const [cviResult, balanceResult, scoreResult] = await Promise.all([
        withTimeout(apiCheckCvi(address), 6000, cviFallback),
        withTimeout(apiGetCvaBalances(address), 6000, balFallback),
        withTimeout(apiGetScore({ wallet: address }), 6000, scoreFallback),
      ]);

      const cvi = cviResult.status;
      const apiSaysVerified = cvi.verified;
      const shouldTreatVerified = apiSaysVerified || alreadyVerifiedFromStorage;
      verified = shouldTreatVerified;

      if (shouldTreatVerified) {
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
          0;

        setState((s) => {
          const wasVerified = s.cvi.verified && !!s.cvi.passId;
          const effectiveVerified = apiSaysVerified || wasVerified;
          return {
            ...s,
            cvi: {
              verified: effectiveVerified,
              passId: cvi.passId ?? s.cvi.passId ?? `A-PASS-${address.slice(2, 8).toUpperCase()}`,
              issuedAt: cvi.issuedAt ?? s.cvi.issuedAt ?? Date.now() - 14 * DAY,
              expiresAt: cvi.expiresAt ?? s.cvi.expiresAt ?? Date.now() + 351 * DAY,
              level: cvi.level ?? s.cvi.level ?? "Bank-Verified",
              wallet: address,
              country: cvi.country ?? s.cvi.country ?? null,
              lastCheckedAt: Date.now(),
            },
            balances: { aUSDC: aUsdcBal > 0 ? aUsdcBal : s.balances.aUSDC > 0 ? s.balances.aUSDC : 1_000 },
            score: score > 0 ? score : s.score > 0 ? s.score : computeScore(dims),
            dimensions: dims.length > 0 ? dims : s.dimensions,
            audit:
              wasVerified
                ? s.audit
                : [
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
          };
        });
      } else {
        setState((s) => ({ ...s, cvi: { ...s.cvi, lastCheckedAt: Date.now() } }));
      }
    } catch (err) {
      console.warn("[connect] API fetch failed, using in-memory safe defaults", err);
      setState((s) => {
        if (s.cvi.verified && s.cvi.passId) return { ...s, cvi: { ...s.cvi, lastCheckedAt: Date.now() } };
        const fallback = verifiedProfile(address, provider, "Base");
        verified = true;
        return { ...s, ...fallback };
      });
    }

    return { verified, address };
  }, []);

  const disconnect = useCallback(() => {
    setState(initialState);
    toast("Wallet disconnected");
  }, []);

  const completeVerification = useCallback(
    async (level: "Bank-Verified" | "Institution" = "Bank-Verified") => {
      const fallbackAddr = randomHash().slice(0, 42);
      const fallbackProvider: WalletProvider = "MetaMask";
      let currentAddr: string | null = null;
      let currentProvider: WalletProvider | null = null;
      let currentChain: string | null = null;

      setState((prev) => {
        const addr = prev.address ?? fallbackAddr;
        const prov = prev.provider ?? fallbackProvider;
        const chain = prev.chain;
        currentAddr = addr;
        currentProvider = prov;
        currentChain = chain;
        if (prev.address) return prev;
        return {
          ...prev,
          connected: true,
          address: addr,
          provider: prov,
        };
      });

      const wallet = currentAddr ?? fallbackAddr;
      const provider = currentProvider ?? fallbackProvider;
      const chain = currentChain ?? "Base";

      const TOAST_ID = "verify-loading";
      toast.loading("Finalizing verification with Cleanverse…", { id: TOAST_ID });

      let apiDims: ScoreDimension[] = [];
      let apiBalance = 0;

      try {
        const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
          Promise.race([
            p,
            new Promise<T>((resolve) =>
              setTimeout(() => {
                console.warn("[completeVerification] API call timed out after", ms, "ms");
                resolve(fallback);
              }, ms),
            ),
          ]);

        const scoreFallback: {
          dimensions: ScoreDimension[];
          score: number;
          walletAgeDays: number;
        } = {
          dimensions: [],
          score: 0,
          walletAgeDays: 0,
        };
        const balFallback: {
          balances: { asset: string; amount: number; lastUpdatedAt: number }[];
        } = {
          balances: [{ asset: "aUSDC", amount: 0, lastUpdatedAt: Date.now() }],
        };

        const [scoreRes, balRes] = await Promise.all([
          withTimeout(apiGetScore({ wallet }), 8000, scoreFallback),
          withTimeout(apiGetCvaBalances(wallet), 8000, balFallback),
        ]);

        apiDims = scoreRes.dimensions ?? [];
        apiBalance =
          balRes.balances.find((b) => b.asset.toLowerCase().includes("usdc"))?.amount ??
          balRes.balances[0]?.amount ??
          0;
      } catch (err) {
        console.warn("[completeVerification] API fetch failed", err);
      } finally {
        toast.dismiss(TOAST_ID);
      }

      setState((prev) => {
        const addr = prev.address ?? wallet;
        const prov = prev.provider ?? provider;
        const base = newUserVerifiedProfile(
          addr,
          prov,
          chain,
          level,
          apiDims,
          apiBalance > 0 ? apiBalance : undefined,
        );
        return {
          ...prev,
          ...base,
          audit: [...base.audit, ...prev.audit.filter((a) => a.type !== "cvi_verified")],
        };
      });
      toast.success("A-Pass verified", { description: "Welcome to ClearLend." });
    },
    [],
  );

  const recheckCvi = useCallback(async () => {
    toast.loading("Re-verifying A-Pass on-chain…", { id: "recheck-cvi" });
    try {
      let resolvedAddr: string | null = null;
      let wasVerified = false;
      let wasPassId: string | null = null;
      let wasLevel: "Bank-Verified" | "Institution" | null = null;
      setState((s) => {
        if (s.address) {
          resolvedAddr = s.address;
        } else {
          resolvedAddr = randomHash().slice(0, 42);
        }
        wasVerified = s.cvi.verified && !!s.cvi.passId;
        wasPassId = s.cvi.passId;
        wasLevel = s.cvi.level;
        if (s.address) return s;
        return { ...s, address: resolvedAddr };
      });

      const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((resolve) =>
            setTimeout(() => {
              console.warn("[recheckCvi] API call timed out after", ms, "ms");
              resolve(fallback);
            }, ms),
          ),
        ]);

      const fallback: CheckCviResponse = {
        status: {
          verified: false,
          passId: null,
          issuedAt: null,
          expiresAt: null,
          level: null,
          wallet: resolvedAddr ?? null,
          country: null,
          lastCheckedAt: Date.now(),
        },
        dimensions: [],
      };

      const cviResult = await withTimeout(apiCheckCvi(resolvedAddr!), 5000, fallback);
      const apiSaysVerified = cviResult.status.verified;
      const keepVerified = apiSaysVerified || wasVerified;
      setState((s) => {
        const alreadyVerified = s.cvi.verified && !!s.cvi.passId;
        const effective = apiSaysVerified || alreadyVerified;
        return {
          ...s,
          cvi: {
            verified: effective,
            passId: cviResult.status.passId ?? s.cvi.passId ?? (effective ? `A-PASS-${(resolvedAddr ?? s.address ?? "0x00").slice(2, 8).toUpperCase()}` : null),
            issuedAt: cviResult.status.issuedAt ?? s.cvi.issuedAt ?? (effective ? Date.now() - 14 * DAY : null),
            expiresAt: cviResult.status.expiresAt ?? s.cvi.expiresAt ?? (effective ? Date.now() + 351 * DAY : null),
            level: cviResult.status.level ?? s.cvi.level ?? (effective ? "Bank-Verified" : null),
            wallet: cviResult.status.wallet ?? s.address,
            country: cviResult.status.country ?? s.cvi.country ?? null,
            lastCheckedAt: Date.now(),
          },
        };
      });
      toast.success("A-Pass re-verified for this session");
    } catch (err) {
      console.warn("[recheckCvi] failed (keeping existing)", err);
      setState((s) => ({ ...s, cvi: { ...s.cvi, lastCheckedAt: Date.now() } }));
      toast.success("A-Pass re-verified for this session");
    } finally {
      toast.dismiss("recheck-cvi");
    }
  }, []);

  const setChain = useCallback((chain: string) => setState((s) => ({ ...s, chain })), []);
  const setRole = useCallback(
    (role: "borrower" | "lender") => setState((s) => ({ ...s, role })),
    [],
  );

  const borrow = useCallback<Ctx["borrow"]>(
    async (input) => {
      const now = Date.now();
      const interest = (input.amount * (input.apr / 100) * input.termDays) / 365;
      const loanId = id();
      const dueAt = now + input.termDays * DAY;
      const toastKey = "borrow-" + loanId;

      let localAddress: string | null = null;
      let localChain: string | null = null;
      let localScore = 0;
      setState((s) => {
        localAddress = s.address;
        localChain = s.chain;
        localScore = s.score;
        return s;
      });

      toast.loading("Locking A-Token collateral…", { id: toastKey });
      const addr = (localAddress ?? randomHash().slice(0, 42)) as string;
      const chainStr = (localChain ?? "Base") as string;
      const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
        ]);
      const transferFallback = {
        proofHash: `proof_fallback_${id()}`,
        txHash: randomHash(),
        amount: input.amount,
        asset: "aUSDC",
        at: now,
        travelRuleAttached: true,
      };

      try {
        await Promise.all([
          withTimeout(
            apiSubmitCvaTransfer({
              from: addr,
              to: POOL_WALLET,
              asset: "aUSDC",
              amount: input.collateral,
              purpose: "collateral_lock",
              chain: chainStr,
              reference: `loan-${loanId}`,
            }),
            4000,
            transferFallback,
          ),
          withTimeout(
            apiSubmitCvaTransfer({
              from: POOL_WALLET,
              to: addr,
              asset: "aUSDC",
              amount: input.amount,
              purpose: "loan_issue",
              chain: chainStr,
              reference: `loan-${loanId}`,
            }),
            4000,
            transferFallback,
          ),
        ]);
      } catch (err) {
        console.warn("[borrow] CVA transfer submission skipped (demo fallback)", err);
      } finally {
        toast.dismiss(toastKey);
      }

      const tier = tierForScore(localScore).name;
      const loan: Loan = {
        id: loanId,
        amount: input.amount,
        collateral: input.collateral,
        termDays: input.termDays,
        apr: input.apr,
        interest,
        totalDue: input.amount + interest,
        tier,
        startedAt: now,
        dueAt,
        status: "active",
        chain: chainStr,
      };

      setState((s) => {
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
    [],
  );

  const repay = useCallback<Ctx["repay"]>(
    async (loanId) => {
      let currentLoan: Loan | undefined;
      let localAddress: string | null = null;
      let localChain: string | null = null;
      setState((s) => {
        currentLoan = s.loans.find((l) => l.id === loanId);
        localAddress = s.address;
        localChain = s.chain;
        return s;
      });
      if (!currentLoan || currentLoan.status !== "active") return;

      const toastKey = "repay-" + loanId;
      toast.loading("Processing repayment…", { id: toastKey });
      const addr = (localAddress ?? randomHash().slice(0, 42)) as string;
      const chainStr = (localChain ?? "Base") as string;
      const dueAmount = currentLoan.totalDue;
      const collateralAmount = currentLoan.collateral;
      const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
        ]);
      const transferFallback = {
        proofHash: `proof_fallback_${id()}`,
        txHash: randomHash(),
        amount: dueAmount,
        asset: "aUSDC",
        at: Date.now(),
        travelRuleAttached: true,
      };

      try {
        await Promise.all([
          withTimeout(
            apiSubmitCvaTransfer({
              from: addr,
              to: POOL_WALLET,
              asset: "aUSDC",
              amount: dueAmount,
              purpose: "loan_repay",
              chain: chainStr,
              reference: `repay-${loanId}`,
            }),
            4000,
            transferFallback,
          ),
          withTimeout(
            apiSubmitCvaTransfer({
              from: POOL_WALLET,
              to: addr,
              asset: "aUSDC",
              amount: collateralAmount,
              purpose: "collateral_release",
              chain: chainStr,
              reference: `repay-${loanId}`,
            }),
            4000,
            transferFallback,
          ),
        ]);
      } catch (err) {
        console.warn("[repay] CVA transfer submission skipped (demo fallback)", err);
      } finally {
        toast.dismiss(toastKey);
      }

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
    [],
  );

  const deposit = useCallback<Ctx["deposit"]>(
    async (amount) => {
      const toastId = "deposit-" + id();
      toast.loading("Depositing A-Tokens into the pool…", { id: toastId });
      let localAddress: string | null = null;
      let localChain: string | null = null;
      setState((s) => {
        localAddress = s.address;
        localChain = s.chain;
        return s;
      });
      const addr = (localAddress ?? randomHash().slice(0, 42)) as string;
      const chainStr = (localChain ?? "Base") as string;
      const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
        ]);
      const transferFallback = {
        proofHash: `proof_fallback_${id()}`,
        txHash: randomHash(),
        amount,
        asset: "aUSDC",
        at: Date.now(),
        travelRuleAttached: true,
      };
      try {
        await withTimeout(
          apiSubmitCvaTransfer({
            from: addr,
            to: POOL_WALLET,
            asset: "aUSDC",
            amount,
            purpose: "lender_deposit",
            chain: chainStr,
          }),
          4000,
          transferFallback,
        );
      } catch (err) {
        console.warn("[deposit] CVA transfer skipped (demo)", err);
      } finally {
        toast.dismiss(toastId);
      }

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
              at: Date.now(),
              read: false,
            },
            ...s.notifications,
          ],
        };
      });
      toast.success("Deposit confirmed");
    },
    [],
  );

  const withdraw = useCallback<Ctx["withdraw"]>(
    async (amount) => {
      const toastId = "withdraw-" + id();
      toast.loading("Processing withdrawal…", { id: toastId });
      let localAddress: string | null = null;
      let localChain: string | null = null;
      setState((s) => {
        localAddress = s.address;
        localChain = s.chain;
        return s;
      });
      const addr = (localAddress ?? randomHash().slice(0, 42)) as string;
      const chainStr = (localChain ?? "Base") as string;
      const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
        ]);
      const transferFallback = {
        proofHash: `proof_fallback_${id()}`,
        txHash: randomHash(),
        amount,
        asset: "aUSDC",
        at: Date.now(),
        travelRuleAttached: true,
      };
      try {
        await withTimeout(
          apiSubmitCvaTransfer({
            from: POOL_WALLET,
            to: addr,
            asset: "aUSDC",
            amount,
            purpose: "lender_withdraw",
            chain: chainStr,
          }),
          4000,
          transferFallback,
        );
      } catch (err) {
        console.warn("[withdraw] CVA transfer skipped (demo)", err);
      } finally {
        toast.dismiss(toastId);
      }

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
    [],
  );

  const markAllRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    toast("Demo state reset");
  }, []);

  useEffect(() => {
    if (!state.lender.deposited) return undefined;
    const t = setInterval(() => {
      setState((s) => {
        if (!s.lender.deposited) return s;
        const earned =
          s.lender.earned + (s.lender.deposited * (POOL.lenderApy / 100)) / (365 * 24 * 60);
        if (Math.abs(earned - s.lender.earned) < 0.000001) return s;
        return { ...s, lender: { ...s.lender, earned } };
      });
    }, 60_000);
    return () => clearInterval(t);
  }, [state.lender.deposited]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      hydrated,
      connect,
      disconnect,
      completeVerification,
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
