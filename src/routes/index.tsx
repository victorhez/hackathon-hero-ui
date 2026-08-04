import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  ChartLine,
  FileCheck2,
  Fingerprint,
  Layers,
  Lock,
  ShieldCheck,
  Sparkle,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/clearlend/logo";
import { TierTable } from "@/components/clearlend/tier-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CHAINS, POOL } from "@/lib/clearlend/types";
import { usd } from "@/lib/clearlend/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClearLend — Identity-Powered DeFi Lending" },
      {
        name: "description",
        content:
          "Borrow with less collateral by proving who you are. ClearLend turns verified identity and clean on-chain history into your credit score.",
      },
      { property: "og:title", content: "ClearLend — Identity-Powered DeFi Lending" },
      {
        property: "og:description",
        content:
          "A gated lending pool where your verified identity lowers collateral and unlocks better rates.",
      },
    ],
  }),
  component: Landing,
});

const steps = [
  {
    icon: Wallet,
    title: "Connect",
    body: "Link MetaMask, WalletConnect or Coinbase Wallet. We check for a valid A-Pass credential.",
  },
  {
    icon: Fingerprint,
    title: "Verify",
    body: "No A-Pass? Complete a one-time bank credential binding and come back verified.",
  },
  {
    icon: ChartLine,
    title: "Get scored",
    body: "Your verified transfer history becomes a Reputation Score from 0 to 100.",
  },
  {
    icon: TrendingUp,
    title: "Borrow better",
    body: "Higher score, lower collateral, cheaper rate. Repay on time and your score grows.",
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Identity-gated pool",
    body: "Every wallet on both sides of the pool holds a verified pass. No anonymous access, zero exceptions.",
  },
  {
    icon: Lock,
    title: "Under-collateralised borrowing",
    body: "Platinum borrowers post as little as 0–20% collateral instead of the usual 120%+.",
  },
  {
    icon: FileCheck2,
    title: "Auditable by design",
    body: "Issuance, repayment and liquidation each emit an on-chain proof you can inspect.",
  },
  {
    icon: Layers,
    title: "Verified-asset settlement",
    body: "Loans, collateral, repayments and yield all settle in verified A-Tokens.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#tiers" className="transition-colors hover:text-foreground">
              Tiers
            </a>
            <a href="#pool" className="transition-colors hover:text-foreground">
              Pool
            </a>
            <a href="#compliance" className="transition-colors hover:text-foreground">
              Compliance
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/connect">Sign in</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/connect">
                Launch app <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-40"
          style={{ backgroundImage: "var(--gradient-glow)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-24 lg:px-8 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
              <Sparkle className="size-3.5 text-primary" />
              Gated lending pools · identity-based credit
            </span>
            <h1 className="mt-6 font-display text-4xl leading-[1.05] font-semibold sm:text-5xl lg:text-6xl">
              Your identity is <span className="text-gradient">your credit line</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              In DeFi today you lock $1,500 to borrow $1,000. ClearLend reads your verified identity
              and clean transfer history instead — so trusted borrowers post less collateral and pay
              lower rates.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" variant="hero" asChild>
                <Link to="/connect">
                  Connect wallet <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/app/lend">Explore the pool</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Testnet demo · A-Pass required to enter the pool
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Pool liquidity", value: usd(POOL.totalLiquidity) },
              { label: "Lender APY", value: `${POOL.lenderApy}%` },
              { label: "Verified lenders", value: POOL.verifiedLenders.toLocaleString() },
              { label: "Default rate", value: `${POOL.defaultRate}%` },
            ].map((s) => (
              <Card key={s.label} className="surface-card p-5 text-center">
                <p className="font-display text-2xl font-semibold">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-border/60 bg-card/30 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="font-display text-3xl font-semibold">
              DeFi lending excludes the people who need it most
            </h2>
            <p className="mt-4 text-muted-foreground">
              Over-collateralisation means only people who already hold crypto wealth can borrow.
              Anonymous wallets carry no history, so a careful borrower is priced exactly like a bad
              actor, and regulated institutions cannot touch an unverified pool at all.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "120%+ collateral on every loan",
              "No reward for trustworthy users",
              "Zero credit history on anonymous wallets",
              "Institutions locked out of unverified pools",
              "Capital sits idle as excess collateral",
              "No compliance trail on lending flows",
            ].map((t) => (
              <Card key={t} className="surface-card p-4 text-sm text-muted-foreground">
                {t}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="font-display text-3xl font-semibold">How ClearLend works</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Four steps from wallet to funded loan — the compliance layer does the heavy lifting.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Card key={s.title} className="surface-card p-6">
                <div className="flex items-center justify-between">
                  <span className="bg-gradient-brand grid size-10 place-items-center rounded-xl text-primary-foreground">
                    <s.icon className="size-5" />
                  </span>
                  <span className="font-display text-sm text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section id="tiers" className="border-y border-border/60 bg-card/30 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="font-display text-3xl font-semibold">Score once, borrow better forever</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Your Reputation Score maps to a borrowing tier. Every on-time repayment and clean
            verified transfer pushes you up.
          </p>
          <Card className="surface-card mt-8 p-6">
            <TierTable />
          </Card>
        </div>
      </section>

      {/* Pool + features */}
      <section id="pool" className="py-20">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 md:grid-cols-2 lg:px-8">
          {features.map((f) => (
            <Card key={f.title} className="surface-card p-6">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section id="compliance" className="border-t border-border/60 bg-card/30 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-3xl font-semibold">Compliance built into the rails</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Credentials are re-checked on every session and before every loan. Sanctions and
                blacklist policy is enforced by the underlying policy engine, not by us.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CHAINS.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Verified identity in, verified assets out",
                body: "Every disbursement, deposit, repayment and yield payment settles in verified A-Tokens.",
              },
              {
                title: "Travel Rule on every transfer",
                body: "Originator and beneficiary data travels with the asset, so lending flows stay reportable.",
              },
              {
                title: "One audit log, on-chain",
                body: "Deposit, borrow, repay, withdraw — each action is logged with a verifiable proof.",
              },
            ].map((c) => (
              <Card key={c.title} className="surface-card p-6">
                <BadgeCheck className="size-5 text-success" />
                <h3 className="mt-4 font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            Ready to turn your identity into <span className="text-gradient">borrowing power?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Connect a verified wallet and see your score, tier and available terms in seconds.
          </p>
          <Button size="lg" variant="hero" className="mt-8" asChild>
            <Link to="/connect">
              Enter ClearLend <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row lg:px-8">
          <Logo />
          <p>Open source · MIT licensed · Testnet demo</p>
        </div>
      </footer>
    </div>
  );
}
