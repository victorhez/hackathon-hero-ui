import { createFileRoute } from "@tanstack/react-router";
import { Activity, BarChart3, Layers, ShieldCheck } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/clearlend/app-shell";
import { Card } from "@/components/ui/card";
import { useClearLend } from "@/lib/clearlend/store";
import { pct, usd } from "@/lib/clearlend/format";
import { POOL, poolUtilisation } from "@/lib/clearlend/types";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({
    meta: [
      { title: "Pool analytics — ClearLend" },
      {
        name: "description",
        content:
          "Live liquidity, utilisation, tier mix and default metrics for the identity-gated lending pool.",
      },
      { property: "og:title", content: "Pool analytics — ClearLend" },
      {
        property: "og:description",
        content: "Liquidity, utilisation and risk analytics for the ClearLend pool.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const LIQUIDITY = [
  { month: "Mar", liquidity: 2.1, borrowed: 1.2 },
  { month: "Apr", liquidity: 2.7, borrowed: 1.7 },
  { month: "May", liquidity: 3.2, borrowed: 2.1 },
  { month: "Jun", liquidity: 3.9, borrowed: 2.6 },
  { month: "Jul", liquidity: 4.4, borrowed: 2.9 },
  { month: "Aug", liquidity: 4.82, borrowed: 3.18 },
];

const TIER_MIX = [
  { name: "Platinum", value: 18, color: "var(--platinum)" },
  { name: "Gold", value: 31, color: "var(--gold)" },
  { name: "Silver", value: 27, color: "var(--silver)" },
  { name: "Bronze", value: 16, color: "var(--bronze)" },
  { name: "Unranked", value: 8, color: "var(--unranked)" },
];

const ISSUANCE = [
  { month: "Mar", loans: 412 },
  { month: "Apr", loans: 588 },
  { month: "May", loans: 731 },
  { month: "Jun", loans: 902 },
  { month: "Jul", loans: 1148 },
  { month: "Aug", loans: 1391 },
];

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function AnalyticsPage() {
  const { state } = useClearLend();
  const util = poolUtilisation(state.lender.deposited);

  const stats = [
    { label: "Total liquidity", value: usd(POOL.totalLiquidity), icon: Layers },
    { label: "Utilisation", value: pct(util), icon: Activity },
    { label: "Loans issued", value: POOL.loansIssued.toLocaleString(), icon: BarChart3 },
    { label: "Default rate", value: pct(POOL.defaultRate, 2), icon: ShieldCheck },
  ];

  return (
    <>
      <PageHeader
        title="Pool analytics"
        subtitle="How the identity-gated pool is performing across liquidity, demand and credit risk."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="surface-card p-5">
            <span className="bg-gradient-brand grid size-9 place-items-center rounded-xl text-primary-foreground">
              <s.icon className="size-4" />
            </span>
            <p className="mt-4 text-xs tracking-wide text-muted-foreground uppercase">{s.label}</p>
            <p className="font-display mt-1 text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="surface-card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold">Liquidity vs borrowed (millions aUSDC)</h2>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={LIQUIDITY}>
                <defs>
                  <linearGradient id="liqFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="borFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-3)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--brand-3)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="liquidity"
                  stroke="var(--brand)"
                  fill="url(#liqFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="borrowed"
                  stroke="var(--brand-3)"
                  fill="url(#borFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="surface-card p-6">
          <h2 className="text-sm font-semibold">Borrower tier mix</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={TIER_MIX}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={82}
                  paddingAngle={3}
                  stroke="none"
                >
                  {TIER_MIX.map((t) => (
                    <Cell key={t.name} fill={t.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-2">
            {TIER_MIX.map((t) => (
              <li key={t.name} className="flex items-center gap-2 text-xs">
                <span className="size-2 rounded-full" style={{ background: t.color }} />
                <span className="flex-1 text-muted-foreground">{t.name}</span>
                <span className="tabular-nums">{t.value}%</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="surface-card mt-6 p-6">
        <h2 className="text-sm font-semibold">Loans issued per month</h2>
        <div className="mt-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ISSUANCE}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
              <Bar dataKey="loans" fill="var(--brand-2)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}
