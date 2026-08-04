import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Info, Lightbulb, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/clearlend/app-shell";
import { ScoreRing } from "@/components/clearlend/score-ring";
import { TierBadge, TierTable } from "@/components/clearlend/tier-badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useClearLend } from "@/lib/clearlend/store";
import { dateFmt, pct } from "@/lib/clearlend/format";
import { nextTier, tierForScore } from "@/lib/clearlend/types";

export const Route = createFileRoute("/app/score")({
  head: () => ({
    meta: [
      { title: "Reputation Score — ClearLend" },
      {
        name: "description",
        content:
          "See how your A-Pass, verified transfer history, repayment record and wallet age combine into your Reputation Score.",
      },
      { property: "og:title", content: "Reputation Score — ClearLend" },
      {
        property: "og:description",
        content: "Four dimensions, one score, better borrowing terms.",
      },
    ],
  }),
  component: ScorePage,
});

function ScorePage() {
  const { state } = useClearLend();
  const tier = tierForScore(state.score);
  const next = nextTier(state.score);
  const progress = next ? ((state.score - tier.min) / (next.min - tier.min)) * 100 : 100;

  const tips = [
    { text: "Repay your next loan on time to gain +8 points", gain: "+8" },
    { text: "Make at least 5 verified A-Token transfers this month", gain: "+4" },
    { text: "Keep your A-Pass renewed before it expires", gain: "+3" },
    { text: "Hold your wallet active for another 30 days", gain: "+2" },
  ];

  return (
    <>
      <PageHeader
        title="Reputation Score"
        subtitle="Your score is recomputed from on-chain signals every time your wallet acts. It is not a static number."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="surface-card flex flex-col items-center p-7">
          <ScoreRing score={state.score} size={200} />
          <TierBadge tier={tier.name} size="lg" className="mt-5" />
          <div className="mt-6 w-full">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{next ? `To ${next.name}` : "Top tier"}</span>
              <span>{next ? `${next.min - state.score} points to go` : "Maintained"}</span>
            </div>
            <Progress value={Math.max(2, Math.min(100, progress))} className="mt-2" />
          </div>
        </Card>

        <Card className="surface-card p-7 lg:col-span-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Score history</h2>
          </div>
          <div className="mt-6 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={state.scoreHistory}>
                <defs>
                  <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-2)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--brand-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <RTooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  fill="url(#scoreFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="surface-card p-7 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">What we analyse</h2>
          </div>
          <div className="mt-6 space-y-5">
            {state.dimensions.map((d) => (
              <div key={d.key}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {d.label}{" "}
                    <span className="text-xs text-muted-foreground">· {d.weight}% weight</span>
                  </p>
                  <p className="text-sm tabular-nums">{d.value}/100</p>
                </div>
                <Progress value={d.value} className="mt-2" />
                <p className="mt-2 text-xs text-muted-foreground">{d.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-5">
          <Card className="surface-card p-7">
            <div className="flex items-center gap-2">
              <BadgeCheck className="size-4 text-success" />
              <h2 className="font-display text-lg font-semibold">Credential status</h2>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">A-Pass ID</dt>
                <dd className="font-mono text-xs">{state.cvi.passId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Level</dt>
                <dd>{state.cvi.level}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Issued</dt>
                <dd>{state.cvi.issuedAt ? dateFmt(state.cvi.issuedAt) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Expires</dt>
                <dd>{state.cvi.expiresAt ? dateFmt(state.cvi.expiresAt) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-success">Active</dd>
              </div>
            </dl>
          </Card>

          <Card className="surface-card p-7">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-warning" />
              <h2 className="font-display text-lg font-semibold">How to gain points</h2>
            </div>
            <ul className="mt-5 space-y-3 text-sm">
              {tips.map((t) => (
                <li key={t.text} className="flex items-start gap-3">
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                    {t.gain}
                  </span>
                  <span className="text-muted-foreground">{t.text}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="surface-card mt-5 p-7">
        <h2 className="font-display text-lg font-semibold">Tier ladder</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You are on {tier.name} — collateral {tier.collateralLabel}, rate {pct(tier.apr)}.
        </p>
        <div className="mt-5">
          <TierTable activeTier={tier.name} />
        </div>
      </Card>
    </>
  );
}
