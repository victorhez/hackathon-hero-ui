import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Check, Lock, ShieldCheck, Sparkle, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/clearlend/app-shell";
import { TierBadge } from "@/components/clearlend/tier-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClearLend } from "@/lib/clearlend/store";
import { dateFmt, pct, tokens, usd } from "@/lib/clearlend/format";
import { tierForScore } from "@/lib/clearlend/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/borrow")({
  head: () => ({
    meta: [
      { title: "Borrow — ClearLend" },
      {
        name: "description",
        content:
          "Pick an amount and term, see your collateral and rate update live against your Reputation tier, then borrow in verified A-Tokens.",
      },
      { property: "og:title", content: "Borrow — ClearLend" },
      {
        property: "og:description",
        content: "Under-collateralised borrowing priced by your identity and history.",
      },
    ],
  }),
  component: BorrowPage,
});

const TERMS = [7, 14, 30];

function BorrowPage() {
  const { state, borrow } = useClearLend();
  const navigate = useNavigate();
  const tier = tierForScore(state.score);
  const [amount, setAmount] = useState(Math.min(1000, tier.limit));
  const [termDays, setTermDays] = useState(14);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const quote = useMemo(() => {
    const collateral = amount * tier.collateralRatio;
    const interest = (amount * (tier.apr / 100) * termDays) / 365;
    return {
      collateral,
      interest,
      total: amount + interest,
      dueAt: Date.now() + termDays * 86_400_000,
      savedVsStandard: amount * 1.2 - collateral,
    };
  }, [amount, termDays, tier]);

  const insufficient = quote.collateral > state.balances.aUSDC;
  const overLimit = amount > tier.limit;
  const canBorrow = amount > 0 && !insufficient && !overLimit && !submitting;

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T) =>
        Promise.race([
          p,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
        ]);
      const loanFallback: Parameters<typeof borrow>[0] = {
        amount,
        collateral: quote.collateral,
        termDays,
        apr: tier.apr,
      };
      const loan: Awaited<ReturnType<typeof borrow>> | null = await withTimeout(
        borrow(loanFallback),
        8000,
        null,
      );
      setConfirmOpen(false);
      if (loan || state.loans.length > 0) {
        navigate({ to: "/app/loans" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Borrow"
        subtitle="Terms are quoted live from your Reputation Score. Everything settles in verified A-Tokens."
        action={<TierBadge tier={tier.name} size="lg" />}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="surface-card p-7 lg:col-span-3">
          <h2 className="font-display text-lg font-semibold">Loan calculator</h2>

          <div className="mt-6 grid gap-2">
            <Label htmlFor="amount">Amount to borrow</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                min={0}
                max={tier.limit}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                className="h-12 pr-20 font-display text-lg"
              />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted-foreground">
                aUSDC
              </span>
            </div>
            <Slider
              value={[Math.min(amount, tier.limit)]}
              max={tier.limit}
              step={Math.max(1, Math.round(tier.limit / 200))}
              onValueChange={([v]) => setAmount(v ?? 0)}
              className="mt-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$0</span>
              <span>
                {tier.name} limit · {usd(tier.limit)}
              </span>
            </div>
          </div>

          <div className="mt-7 grid gap-2">
            <Label>Loan term</Label>
            <div className="grid grid-cols-3 gap-2">
              {TERMS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTermDays(t)}
                  className={cn(
                    "rounded-xl border p-4 text-center transition-colors",
                    termDays === t
                      ? "border-primary bg-accent/60"
                      : "border-border hover:bg-accent/40",
                  )}
                >
                  <span className="font-display block text-lg font-semibold">{t}</span>
                  <span className="text-xs text-muted-foreground">days</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/50 p-4">
              <Lock className="size-4 text-primary" />
              <p className="mt-3 text-xs text-muted-foreground">
                Collateral required ({pct(tier.collateralRatio * 100, 0)})
              </p>
              <p className="font-display text-xl font-semibold">{usd(quote.collateral, 2)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/50 p-4">
              <Sparkle className="size-4 text-primary" />
              <p className="mt-3 text-xs text-muted-foreground">Interest ({pct(tier.apr)} APR)</p>
              <p className="font-display text-xl font-semibold">{usd(quote.interest, 2)}</p>
            </div>
          </div>

          {overLimit && (
            <p className="mt-4 flex items-center gap-2 text-sm text-warning">
              <AlertTriangle className="size-4" /> Above your {tier.name} limit of {usd(tier.limit)}
              . Improve your score to unlock more.
            </p>
          )}
          {insufficient && (
            <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4" /> You need {usd(quote.collateral, 2)} of A-Tokens
              as collateral — balance is {tokens(state.balances.aUSDC)}.
            </p>
          )}

          <Button
            variant="hero"
            size="lg"
            className="mt-6 w-full"
            disabled={!canBorrow}
            onClick={() => setConfirmOpen(true)}
          >
            Review loan <ArrowRight className="size-4" />
          </Button>
        </Card>

        <div className="grid gap-5 lg:col-span-2">
          <Card className="surface-card p-7">
            <h2 className="font-display text-lg font-semibold">Summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
              {[
                ["Borrow amount", usd(amount, 2)],
                ["Term", `${termDays} days`],
                ["Interest rate", `${pct(tier.apr)} APR`],
                ["Collateral locked", usd(quote.collateral, 2)],
                ["Total repayment", usd(quote.total, 2)],
                ["Due date", dateFmt(quote.dueAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 rounded-xl border border-success/30 bg-success/10 p-4 text-xs text-success">
              You lock {usd(quote.savedVsStandard, 0)} less collateral than a standard 120%
              over-collateralised DeFi loan.
            </div>
          </Card>

          <Card className="surface-card p-7 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Before you borrow</h2>
            </div>
            <ul className="mt-4 space-y-3 text-muted-foreground">
              {[
                "Your A-Pass is re-checked before the loan is signed.",
                "Collateral is locked in the vault contract for the full term.",
                "Repay in full and collateral releases automatically.",
                "Default past the grace period and collateral is liquidated to cover lenders.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="size-3.5" /> Balance {tokens(state.balances.aUSDC)}
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your loan</DialogTitle>
            <DialogDescription>
              Signing locks your collateral and disburses A-Tokens to your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {[
              ["Amount", usd(amount, 2)],
              ["Term", `${termDays} days`],
              ["Rate", `${pct(tier.apr)} APR (${tier.name})`],
              ["Collateral locked", usd(quote.collateral, 2)],
              ["Interest", usd(quote.interest, 2)],
              ["Total due", usd(quote.total, 2)],
              ["Due date", dateFmt(quote.dueAt)],
              ["Settlement", `A-Tokens on ${state.chain}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" disabled={submitting} onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="hero" disabled={submitting || !canBorrow} onClick={submit}>
              Sign & borrow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
