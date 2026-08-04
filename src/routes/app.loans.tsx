import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Clock, HandCoins, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/clearlend/app-shell";
import { TierBadge } from "@/components/clearlend/tier-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClearLend } from "@/lib/clearlend/store";
import { countdown, dateFmt, pct, usd } from "@/lib/clearlend/format";
import type { Loan } from "@/lib/clearlend/types";

export const Route = createFileRoute("/app/loans")({
  head: () => ({
    meta: [
      { title: "My loans — ClearLend" },
      {
        name: "description",
        content:
          "Track outstanding balances, due dates and penalties, and repay in one click to release your collateral.",
      },
      { property: "og:title", content: "My loans — ClearLend" },
      { property: "og:description", content: "Active loan tracking and one-click repayment." },
    ],
  }),
  component: LoansPage,
});

function LoanCard({ loan, onRepay }: { loan: Loan; onRepay?: () => void }) {
  const late = loan.status === "active" && Date.now() > loan.dueAt;
  const elapsed = Math.min(
    100,
    ((Date.now() - loan.startedAt) / (loan.dueAt - loan.startedAt)) * 100,
  );
  return (
    <Card className="surface-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-display text-2xl font-semibold">{usd(loan.amount)}</p>
            <TierBadge tier={loan.tier} size="sm" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {loan.termDays}-day term · {pct(loan.apr)} APR · {loan.chain} · opened{" "}
            {dateFmt(loan.startedAt)}
          </p>
        </div>
        <span
          className={
            loan.status === "repaid"
              ? "rounded-full bg-success/15 px-3 py-1 text-xs text-success"
              : late
                ? "rounded-full bg-destructive/15 px-3 py-1 text-xs text-destructive"
                : "rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
          }
        >
          {loan.status === "repaid" ? "Repaid" : late ? "Overdue" : "Active"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        {[
          ["Outstanding", loan.status === "repaid" ? usd(0) : usd(loan.totalDue, 2)],
          ["Collateral locked", loan.status === "repaid" ? "Released" : usd(loan.collateral, 2)],
          ["Interest", usd(loan.interest, 2)],
          [
            loan.status === "repaid" ? "Repaid on" : "Due",
            loan.status === "repaid" && loan.repaidAt
              ? dateFmt(loan.repaidAt)
              : dateFmt(loan.dueAt),
          ],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-background/50 p-3">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 text-sm font-medium">{v}</p>
          </div>
        ))}
      </div>

      {loan.status === "active" && (
        <>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" /> {countdown(loan.dueAt)}
              </span>
              <span>{pct(elapsed, 0)} of term elapsed</span>
            </div>
            <Progress value={elapsed} className="mt-2" />
          </div>
          {late ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="size-4" /> Past due. A 5% penalty accrues and your collateral
              is liquidated after the grace period.
            </p>
          ) : (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background/50 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" /> Repaying on time adds roughly +8 points
              to your Reputation Score.
            </p>
          )}
          <Button variant="hero" className="mt-5 w-full" onClick={onRepay}>
            Repay {usd(loan.totalDue, 2)} in A-Tokens
          </Button>
        </>
      )}
    </Card>
  );
}

function LoansPage() {
  const { state, repay } = useClearLend();
  const active = state.loans.filter((l) => l.status === "active");
  const history = state.loans.filter((l) => l.status !== "active");

  return (
    <>
      <PageHeader
        title="My loans"
        subtitle="Outstanding balance, time remaining and one-click repayment straight from your A-Token wallet."
        action={
          <Button variant="hero" asChild>
            <Link to="/app/borrow">
              <HandCoins className="size-4" /> New loan
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6 space-y-5">
          {active.length === 0 ? (
            <Card className="surface-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No active loans right now. Open one to start building repayment history.
              </p>
              <Button variant="hero" className="mt-5" asChild>
                <Link to="/app/borrow">Borrow</Link>
              </Button>
            </Card>
          ) : (
            active.map((l) => <LoanCard key={l.id} loan={l} onRepay={() => repay(l.id)} />)
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-5">
          {history.length === 0 ? (
            <Card className="surface-card p-10 text-center text-sm text-muted-foreground">
              Closed loans will appear here with their repayment outcome.
            </Card>
          ) : (
            history.map((l) => <LoanCard key={l.id} loan={l} />)
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
