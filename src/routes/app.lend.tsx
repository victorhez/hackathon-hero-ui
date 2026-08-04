import { createFileRoute } from "@tanstack/react-router";
import { Info, PiggyBank, TrendingUp } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/clearlend/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClearLend } from "@/lib/clearlend/store";
import { pct, tokens, usd } from "@/lib/clearlend/format";
import { POOL, poolUtilisation } from "@/lib/clearlend/types";

export const Route = createFileRoute("/app/lend")({
  head: () => ({
    meta: [
      { title: "Lend & earn — ClearLend" },
      {
        name: "description",
        content:
          "Supply verified A-Tokens to a compliance-gated lending pool and earn yield paid pro-rata from borrower interest.",
      },
      { property: "og:title", content: "Lend & earn — ClearLend" },
      { property: "og:description", content: "Compliant, traceable yield from verified borrowers." },
    ],
  }),
  component: LendPage,
});

function LendPage() {
  const { state, deposit, withdraw } = useClearLend();
  const [depositAmount, setDepositAmount] = useState(500);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const position = state.lender;
  const available = position.deposited + position.earned;

  return (
    <>
      <PageHeader
        title="Lend & earn"
        subtitle="Only verified wallets can supply — the compliance gate applies to both sides of the pool."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="grid gap-5 lg:col-span-2">
          <Card className="surface-card p-7">
            <h2 className="font-display text-lg font-semibold">Pool stats</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                ["Total liquidity", usd(POOL.totalLiquidity + position.deposited)],
                ["Lender APY", `${POOL.lenderApy}%`],
                ["Utilisation", pct(poolUtilisation(position.deposited))],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-border bg-background/50 p-4">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="font-display text-xl font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Borrowed {usd(POOL.borrowed)}</span>
                <span>Idle {usd(POOL.totalLiquidity + position.deposited - POOL.borrowed)}</span>
              </div>
              <Progress value={poolUtilisation(position.deposited)} className="mt-2" />
            </div>
            <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5" />
              Yield is distributed pro-rata from borrower interest payments. Minimum deposit is{" "}
              {usd(POOL.minDeposit)} so smaller lenders can participate.
            </p>
          </Card>

          <Card className="surface-card p-7">
            <Tabs defaultValue="deposit">
              <TabsList>
                <TabsTrigger value="deposit">Deposit</TabsTrigger>
                <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
              </TabsList>

              <TabsContent value="deposit" className="mt-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="dep">Amount (aUSDC)</Label>
                  <Input
                    id="dep"
                    type="number"
                    min={POOL.minDeposit}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value)))}
                    className="h-12 font-display text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wallet balance {tokens(state.balances.aUSDC)} · projected yearly yield{" "}
                    {usd((depositAmount * POOL.lenderApy) / 100, 2)}
                  </p>
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={
                    depositAmount < POOL.minDeposit || depositAmount > state.balances.aUSDC
                  }
                  onClick={() => deposit(depositAmount)}
                >
                  Deposit {usd(depositAmount)} into pool
                </Button>
              </TabsContent>

              <TabsContent value="withdraw" className="mt-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="wd">Amount (aUSDC)</Label>
                  <Input
                    id="wd"
                    type="number"
                    min={0}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Math.max(0, Number(e.target.value)))}
                    className="h-12 font-display text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available to withdraw {tokens(available, 4)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={withdrawAmount <= 0 || withdrawAmount > available}
                  onClick={() => withdraw(withdrawAmount)}
                >
                  Withdraw {usd(withdrawAmount)}
                </Button>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <Card className="surface-card p-7">
          <div className="flex items-center gap-2">
            <PiggyBank className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Your position</h2>
          </div>
          <div className="mt-6 space-y-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Supplied</p>
              <p className="font-display text-2xl font-semibold">{tokens(position.deposited)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Interest earned</p>
              <p className="font-display text-2xl font-semibold text-success">
                {tokens(position.earned, 4)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="size-3.5 text-success" /> Accruing at {POOL.lenderApy}% APY
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
