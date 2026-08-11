import { defineConfig, type Plugin } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function randomHash(prefix = "0x", len = 40) {
  return (
    prefix +
    Array.from({ length: len }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")
  );
}

function deterministicWalletAgeDays(wallet: string): number {
  let hash = 0;
  for (let i = 2; i < wallet.length; i++) {
    hash = (hash * 31 + wallet.charCodeAt(i)) >>> 0;
  }
  return 30 + (hash % 720);
}

function mapCviLevel(raw: unknown): "Bank-Verified" | "Institution" | null {
  if (raw === "Institution" || raw === "institution") return "Institution";
  if (raw === "Bank-Verified" || raw === "bank" || raw === "bank_verified") return "Bank-Verified";
  return null;
}

function collectScoreInputs(
  wallet: string,
  repaymentValue: number,
  walletAgeDays: number,
  verified = false,
  level: "Bank-Verified" | "Institution" | null = null,
  issuedAt: number | null = null,
) {
  const DAY = 86_400_000;
  let cviScore = 0;
  if (verified) {
    if (level === "Institution") {
      cviScore = 100;
    } else if (level === "Bank-Verified") {
      const freshnessDays = issuedAt
        ? Math.max(0, Math.min(365, (Date.now() - issuedAt) / DAY))
        : 180;
      let bonus = 30;
      if (freshnessDays < 60) bonus = 40;
      else if (freshnessDays > 300) bonus = Math.max(10, 40 - (freshnessDays - 300) / 10);
      cviScore = Math.min(100, 60 + Math.round(bonus));
    } else {
      cviScore = 40;
    }
  }
  const cvaScore = Math.min(100, Math.round(25 * 1 + Math.min(40, 0) + Math.min(35, 0)));
  const clampedRepayment = Math.max(0, Math.min(100, Math.round(repaymentValue)));
  const walletScore = Math.min(100, Math.round(Math.min(100, walletAgeDays) / 1.2));
  return [
    {
      key: "cvi" as const,
      label: "CVI Verification Level",
      weight: 30,
      value: cviScore,
      description: "Validity, level and freshness of your A-Pass credential.",
    },
    {
      key: "cva" as const,
      label: "CVA Transaction History",
      weight: 30,
      value: cvaScore,
      description: "Volume, consistency and cleanliness of your A-Token transfers.",
    },
    {
      key: "repayment" as const,
      label: "Loan Repayment Record",
      weight: 25,
      value: clampedRepayment,
      description: "Your ClearLend borrowing history and on-time repayments.",
    },
    {
      key: "wallet" as const,
      label: "Wallet Age & Activity",
      weight: 15,
      value: walletScore,
      description: "How long your wallet has been active across Cleanverse.",
    },
  ];
}

async function readJsonBody(req: {
  body?: unknown;
}): Promise<unknown> {
  if (req.body !== undefined) return req.body;
  return {};
}

function cleanverseDevApiPlugin(): Plugin {
  return {
    name: "clearlend-cleanverse-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/cleanverse", async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const pathname = url.pathname.replace(/\/+$/, "");
        const OVERALL_TIMEOUT_MS = 500;
        let responded = false;
        const safetyTimer = setTimeout(() => {
          if (responded) return;
          responded = true;
          console.warn("[clearlend-dev-api] overall timeout for", pathname);
          if (!res.headersSent) {
            res.statusCode = 504;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
          }
          try {
            res.end(JSON.stringify({ error: "Dev API timeout", path: pathname }));
          } catch {
            try {
              res.destroy();
            } catch {
              /* ignore */
            }
          }
        }, OVERALL_TIMEOUT_MS);
        const safeEnd = (body: string) => {
          if (responded) return;
          responded = true;
          clearTimeout(safetyTimer);
          res.end(body);
        };
        const safeSendStatus = (code: number, body: unknown) => {
          if (responded) return;
          responded = true;
          clearTimeout(safetyTimer);
          if (!res.headersSent) res.statusCode = code;
          res.end(JSON.stringify(body));
        };

        try {
          let body: unknown = {};
          if (req.method !== "GET") {
            try {
              body = await readJsonBody(req as unknown as Parameters<typeof readJsonBody>[0]);
            } catch {
              body = {};
            }
          }

          const getWallet = (): string => {
            const fromBody = (body as { wallet?: string }).wallet;
            const fromQuery = url.searchParams.get("wallet");
            const w = String(fromBody ?? fromQuery ?? "").trim();
            if (w) return w.toLowerCase();
            return randomHash().slice(0, 42);
          };

          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

          if (pathname === "/cvi-check" || pathname === "/cvi-session") {
            const wallet = getWallet();

            if (pathname === "/cvi-session") {
              const redirectUrl = String(
                url.searchParams.get("redirectUrl") ??
                  (body as { redirectUrl?: string }).redirectUrl ??
                  "/verify",
              );
              const accountType =
                url.searchParams.get("accountType") ??
                (body as { accountType?: string }).accountType ??
                "individual";
              const country =
                url.searchParams.get("country") ??
                (body as { country?: string }).country;
              const level = mapCviLevel(accountType) ?? "Bank-Verified";
              const now = Date.now();
              const dimensions = collectScoreInputs(
                wallet,
                50,
                deterministicWalletAgeDays(wallet),
                true,
                level,
                now,
              );
              const score = Math.max(
                0,
                Math.min(
                  100,
                  Math.round(dimensions.reduce((acc, d) => acc + d.value * d.weight, 0) / 100),
                ),
              );
              const status = {
                verified: true,
                passId: "A-PASS-" + wallet.slice(2, 8).toUpperCase(),
                issuedAt: now,
                expiresAt: now + 365 * 86_400_000,
                level,
                wallet,
                country: country ?? null,
                lastCheckedAt: now,
              };
              res.statusCode = 200;
              safeEnd(
                JSON.stringify({
                  sessionId: "sess_dev_" + Math.random().toString(36).slice(2, 10),
                  redirectUrl: `${redirectUrl}?dev=cvi&wallet=${encodeURIComponent(wallet)}`,
                  status,
                  dimensions,
                  score,
                }),
              );
              return;
            }

            const now = Date.now();
            const level: "Bank-Verified" | "Institution" = "Bank-Verified";
            const dimensions = collectScoreInputs(
              wallet,
              50,
              deterministicWalletAgeDays(wallet),
              true,
              level,
              now - 14 * 86_400_000,
            );
            const status = {
              verified: true,
              passId: "A-PASS-" + wallet.slice(2, 8).toUpperCase(),
              issuedAt: now - 14 * 86_400_000,
              expiresAt: now + 351 * 86_400_000,
              level,
              wallet,
              country: null,
              lastCheckedAt: now,
            };
            res.statusCode = 200;
            safeEnd(JSON.stringify({ status, dimensions }));
            return;
          }

          if (pathname === "/cva-balances") {
            const wallet = getWallet();
            let seed = 0;
            for (let i = 2; i < Math.min(10, wallet.length); i++) {
              seed = (seed * 13 + wallet.charCodeAt(i)) >>> 0;
            }
            const amount = 1000 + (seed % 15000);
            res.statusCode = 200;
            safeEnd(
              JSON.stringify({
                balances: [{ asset: "aUSDC", amount, lastUpdatedAt: Date.now() }],
                wallet,
              }),
            );
            return;
          }

          if (pathname === "/cva-history") {
            const wallet = getWallet();
            res.statusCode = 200;
            safeEnd(
              JSON.stringify({
                transfers: [],
                volume: 0,
                cleanRate: 1,
                count: 0,
                windowDays: 180,
                wallet,
              }),
            );
            return;
          }

          if (pathname === "/cva-transfer") {
            const input = body as Record<string, unknown>;
            const readParam = (key: string, fallback: unknown = undefined) => {
              const q = url.searchParams.get(key);
              if (q !== null) return q;
              return input[key] ?? fallback;
            };
            res.statusCode = 200;
            safeEnd(
              JSON.stringify({
                proofHash: `proof_dev_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`,
                txHash: randomHash(),
                amount: Number(readParam("amount", 0)),
                asset: String(readParam("asset", "aUSDC")),
                at: Date.now(),
                travelRuleAttached: true,
              }),
            );
            return;
          }

          if (pathname === "/score") {
            const wallet = getWallet();
            const repaymentRaw =
              (body as { repaymentValue?: unknown }).repaymentValue ??
              url.searchParams.get("repaymentValue");
            const walletAgeRaw =
              (body as { walletAgeDays?: unknown }).walletAgeDays ??
              url.searchParams.get("walletAgeDays");
            const repaymentValue =
              repaymentRaw !== undefined ? Math.max(0, Math.min(100, Number(repaymentRaw))) : 50;
            const walletAgeDays =
              walletAgeRaw !== undefined
                ? Number(walletAgeRaw)
                : deterministicWalletAgeDays(wallet);
            const level: "Bank-Verified" | "Institution" = "Bank-Verified";
            const issuedAt = Date.now() - 14 * 86_400_000;
            const dimensions = collectScoreInputs(
              wallet,
              repaymentValue,
              walletAgeDays,
              true,
              level,
              issuedAt,
            );
            const score = Math.max(
              0,
              Math.min(
                100,
                Math.round(dimensions.reduce((acc, d) => acc + d.value * d.weight, 0) / 100),
              ),
            );
            res.statusCode = 200;
            safeEnd(JSON.stringify({ dimensions, score, walletAgeDays }));
            return;
          }

          safeSendStatus(404, { error: "Not found" });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          safeSendStatus(400, { error: message });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    tsConfigPaths(),
    cleanverseDevApiPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    strictPort: false,
  },
  ssr: {
    noExternal: ["@tailwindcss/vite", "tw-animate-css", "tailwindcss", "recharts"],
  },
  build: {
    sourcemap: false,
  },
  define: {
    "import.meta.env.VITE_APP_NAME": JSON.stringify("ClearLend"),
  },
});
