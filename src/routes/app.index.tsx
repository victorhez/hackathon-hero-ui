import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  HandCoins,
  Percent,
  PiggyBank,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/clearlend/app-shell";
import { ScoreRing } from "@/components/clearlend/score-ring";
import { TierBadge } from "@/components/clearlend/tier-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useClearLend } from "@/lib/clearlend/store";
import { countdown, dateFmt, pct, tokens, usd } from "@/lib/clearlend/format";
import { POOL, nextTier, poolUtilisation, tierForScore } from "@/lib/clearlend/types";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ClearLend" },
      {
        name: "description",
        content:
          "Your Reputation Score, borrowing tier, active loans and pool position at a glance.",
      },
      { property: "og:title", content: "Dashboard — ClearLend" },
      { property: "og:description", content: "Identity-powered borrowing terms, live." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, recheckCvi } = useClearLend();
  const tier = tierForScore(state.score);
  const next = nextTier(state.score);
  const activeLoans = state.loans.filter((l) => l.status === "active");
  const outstanding = activeLoans.reduce((a, l) => a + l.totalDue, 0);
  const isNew = state.loans.length === 0 && state.lender.deposited === 0;
  const progressToNext = next
    ? ((state.score - tier.min) / (next.min - tier.min)) * 100
    : 100;

  return (
    <>
      <PageHeader
        title={isNew ? "Welcome to ClearLend" : "Dashboard"}
        subtitle={
          isNew
            ? "Your A-Pass is active. Here's your starting Reputation Score and what you can borrow today."
            : "Everything about your identity-backed credit in one place."
        }
        action={
          <Button variant="outline" onClick={recheckCvi}>
            <RefreshCw className="size-4" /> Re-verify A-Pass
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Score card */}
        <Card className="surface-card flex flex-col items-center p-7 lg:col-span-1">
          <ScoreRing score={state.score} size={210} />
          <TierBadge tier={tier.name} size="lg" className="mt-5" />
          <div className="mt-6 w-full space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{next ? `Progress to ${next.name}` : "Top tier reached"}</span>
              <span>
                {next ? `${state.score}/${next.min}` : `${state.score}/100`}
              </span>
            </div>
            <Progress value={Math.max(2, Math.min(100, progressToNext))} />
            <p className="text-xs text-muted-foreground">
              {next
                ? `Repay your next loan on time to gain +8 points and move toward ${next.name}.`
                : "Maintain on-time repayments to hold Platinum terms."}
            </p>
          </div>
          <Button variant="soft" className="mt-5 w-full" asChild>
            <Link to="/app/score">
              View score breakdown <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>

        {/* Terms + stats */}
        <div className="grid gap-5 lg:col-span-2">
          <Card className="surface-card p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">Your current terms</h2>
              <span className="flex items-center gap-1.5 text-xs text-success">
                <BadgeCheck className="size-4" /> A-Pass verified · valid to{" "}
                {state.cvi.expiresAt ? dateFmt(state.cvi.expiresAt) : "—"}
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Percent,
                  label: "Collateral required",
                  value: pct(tier.collateralRatio * 100, 0),
                  sub: tier.collateralLabel + " band",
                },
                {
                  icon: HandCoins,
                  label: "Borrowing limit",
                  value: usd(tier.limit),
                  sub: `${tier.name} tier cap`,
                },
                {
                  icon: TrendingUp,
                  label: "Interest rate",
                  value: pct(tier.apr),
                  sub: tier.rateLabel,
                },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-background/50 p-4">
                  <s.icon className="size-4 text-primary" />
                  <p className="mt-3 text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-display text-xl font-semibold">{s.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="hero" asChild>
                <Link to="/app/borrow">
                  Borrow now <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/lend">Lend & earn {POOL.lenderApy}%</Link>
              </Button>
            </div>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2">
            <Card className="surface-card p-6">
              <Wallet className="size-4 text-primary" />
              <p className="mt-3 text-xs text-muted-foreground">Wallet balance</p>
              <p className="font-display text-2xl font-semibold">{tokens(state.balances.aUSDC)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Verified assets on {state.chain}
              </p>
            </Card>
            <Card className="surface-card p-6">
              <PiggyBank className="size-4 text-primary" />
              <p className="mt-3 text-xs text-muted-foreground">Supplied to pool</p>
              <p className="font-display text-2xl font-semibold">{tokens(state.lender.deposited)}</p>
              <p className="mt-1 text-xs text-success">
                +{tokens(state.lender.earned, 4)} earned
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Loans + pool */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="surface-card p-7 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Active loans</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/loans">All loans</Link>
            </Button>
          </div>
          {activeLoans.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No active loans. Your {tier.name} tier lets you borrow up to {usd(tier.limit)} at{" "}
                {pct(tier.apr)}.
              </p>
              <Button variant="hero" size="sm" className="mt-4" asChild>
                <Link to="/app/borrow">Open a loan</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {activeLoans.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-background/50 p-4"
                >
                  <div>
                    <p className="font-display text-lg font-semibold">{usd(l.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.termDays}-day term · {pct(l.apr)} APR · {l.chain}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{usd(l.totalDue, 2)} due</p>
                    <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> {countdown(l.dueAt)}
                    </p>
                  </div>
                  <Button variant="soft" size="sm" asChild>
                    <Link to="/app/loans">Manage</Link>
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Total outstanding: {usd(outstanding, 2)}
              </p>
            </div>
          )}
        </Card>

        <Card className="surface-card p-7">
          <h2 className="font-display text-lg font-semibold">Pool health</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Utilisation</span>
                <span>{pct(poolUtilisation(state.lender.deposited))}</span>
              </div>
              <Progress value={poolUtilisation(state.lender.deposited)} className="mt-2" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total liquidity</span>
              <span>{usd(POOL.totalLiquidity + state.lender.deposited)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lender APY</span>
              <span className="text-success">{POOL.lenderApy}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Loans issued</span>
              <span>{POOL.loansIssued.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Default rate</span>
              <span>{POOL.defaultRate}%</span>
            </div>
          </div>
          <Button variant="outline" className="mt-6 w-full" asChild>
            <Link to="/app/lend">Supply liquidity</Link>
          </Button>
        </Card>
      </div>
    </>
  );
}
