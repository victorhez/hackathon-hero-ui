import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Fingerprint,
  Landmark,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/clearlend/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useClearLend } from "@/lib/clearlend/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Get your A-Pass — ClearLend verification" },
      {
        name: "description",
        content:
          "A one-time identity check binds your bank credential to your wallet and issues the A-Pass that unlocks ClearLend.",
      },
      { property: "og:title", content: "Get your A-Pass — ClearLend verification" },
      {
        property: "og:description",
        content: "Verify once, then borrow with less collateral for life.",
      },
    ],
  }),
  component: VerifyPage,
});

const stepsMeta = [
  { title: "What is an A-Pass?", icon: Fingerprint },
  { title: "Bank credential", icon: Landmark },
  { title: "Bind your wallet", icon: Wallet },
  { title: "Pass issued", icon: Check },
];

function VerifyPage() {
  const { state, completeVerification } = useClearLend();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [bank, setBank] = useState("");
  const [country, setCountry] = useState("");
  const [legalName, setLegalName] = useState("");
  const [accountType, setAccountType] = useState<"Bank-Verified" | "Institution">("Bank-Verified");
  const [consent, setConsent] = useState(false);

  const goStep = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const skipAllToDashboard = () => {
    try {
      completeVerification(accountType);
    } catch {
      /* ignore — continue navigation */
    }
    navigate({ to: "/app" });
  };

  const approveBank = () => {
    goStep(2);
  };

  const signBind = () => {
    try {
      completeVerification(accountType);
    } catch {
      /* ignore */
    }
    goStep(3);
  };

  const demoAddr =
    state.address ??
    (typeof window !== "undefined"
      ? "0x" +
        Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(
          "",
        )
      : "0x0000…0000");
  const shortAddr =
    demoAddr.length > 12 ? `${demoAddr.slice(0, 8)}…${demoAddr.slice(-4)}` : demoAddr;

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
      <header className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={skipAllToDashboard}>
            Skip demo → dashboard
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/connect">
              <ArrowLeft className="size-4" /> Back to connect
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        {/* Stepper */}
        <div className="mb-8 flex items-center gap-2">
          {stepsMeta.map((s, i) => (
            <div key={s.title} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl border text-sm transition-colors cursor-pointer select-none",
                  i < step && "border-transparent bg-success text-success-foreground",
                  i === step && "bg-gradient-brand border-transparent text-primary-foreground",
                  i > step && "border-border text-muted-foreground",
                )}
                onClick={() => goStep(i)}
                title={`Jump to step ${i + 1}: ${s.title}`}
              >
                {i < step ? <Check className="size-4" /> : <s.icon className="size-4" />}
              </div>
              {i < stepsMeta.length - 1 && (
                <div
                  className={cn("h-px flex-1", i < step ? "bg-success" : "bg-border")}
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>

        <Card className="surface-card p-8">
          {step === 0 && (
            <>
              <h1 className="font-display text-2xl font-semibold">
                Verify once. Borrow better forever.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                ClearLend is a members-only lending pool. Instead of asking you to
                over-collateralise a loan, we ask you to prove you're a real, verified person —
                using a credential your bank already issued.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  {
                    t: "It's a one-time check",
                    b: "You confirm your identity with your bank once and receive a reusable A-Pass credential bound to your wallet.",
                  },
                  {
                    t: "We never see your documents",
                    b: "Only a yes/no verification result and a credential reference reach ClearLend. No document copies, ever.",
                  },
                  {
                    t: "It lowers your costs",
                    b: "Verified borrowers post far less collateral and pay lower interest than anonymous wallets.",
                  },
                  {
                    t: "You can revoke it",
                    b: "Unbinding your pass removes your access to the pool but keeps your repayment record intact.",
                  },
                ].map((x) => (
                  <div
                    key={x.t}
                    className="rounded-xl border border-border bg-background/50 p-4 text-sm"
                  >
                    <p className="font-medium">{x.t}</p>
                    <p className="mt-1 text-muted-foreground">{x.b}</p>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Button variant="hero" size="lg" className="flex-1" onClick={() => goStep(1)}>
                  Start verification <ArrowRight className="size-4" />
                </Button>
                <Button
                  variant="soft"
                  size="lg"
                  className="flex-1"
                  onClick={skipAllToDashboard}
                >
                  Demo: skip to dashboard
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="font-display text-2xl font-semibold">Bank credential</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose the institution that holds your verified identity. You'll approve the check
                in their app.
              </p>
              <div className="mt-6 grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="legal">Full legal name</Label>
                  <Input
                    id="legal"
                    placeholder="As it appears on your bank account"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Nigeria",
                          "United States",
                          "United Kingdom",
                          "Germany",
                          "Singapore",
                          "UAE",
                        ].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Institution</Label>
                    <Select value={bank} onValueChange={setBank}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "First Meridian Bank",
                          "Northline Savings",
                          "Atlas Federal",
                          "Harbour Trust",
                          "Zenith Digital Bank",
                        ].map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Account type</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        { v: "Bank-Verified", l: "Individual", icon: Fingerprint },
                        { v: "Institution", l: "Institution", icon: Building2 },
                      ] as const
                    ).map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => setAccountType(o.v)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                          accountType === o.v
                            ? "border-primary bg-accent/60"
                            : "border-border hover:bg-accent/40",
                        )}
                      >
                        <o.icon className="size-4 text-primary" />
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-4 text-xs text-muted-foreground">
                  <Checkbox
                    checked={consent}
                    onCheckedChange={(v) => setConsent(Boolean(v))}
                    className="mt-0.5"
                  />
                  I authorise my institution to share a verification result with the compliance
                  layer and to bind the resulting credential to my wallet.
                </label>
              </div>
              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex-1"
                  onClick={() => goStep(0)}
                >
                  Back
                </Button>
                <Button
                  variant="hero"
                  size="lg"
                  className="flex-[2]"
                  onClick={approveBank}
                >
                  Approve with bank →
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="font-display text-2xl font-semibold">Bind your wallet</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign a message from your wallet to bind the verification result to this address.
                This proves the pass and the wallet belong to the same person.
              </p>
              <div className="mt-6 rounded-2xl border border-border bg-background/50 p-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Bank check</span>
                  <span className="flex items-center gap-1.5 text-success">
                    <Check className="size-4" /> Passed
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-muted-foreground">Wallet</span>
                  <span className="font-mono text-xs">{shortAddr}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-muted-foreground">Credential type</span>
                  <span>{accountType}</span>
                </div>
              </div>
              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex-1"
                  onClick={() => goStep(1)}
                >
                  Back
                </Button>
                <Button variant="hero" size="lg" className="flex-[2]" onClick={signBind}>
                  Sign & bind wallet →
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-success/15">
                <Check className="size-8 text-success" />
              </span>
              <h1 className="mt-5 font-display text-2xl font-semibold">Your A-Pass is active</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Credential{" "}
                <span className="font-mono">
                  {state.cvi.passId ?? "A-PASS-" + demoAddr.slice(2, 8).toUpperCase()}
                </span>{" "}
                is bound to your wallet. You start at a baseline Reputation Score and build from
                there.
              </p>
              <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="text-xs text-muted-foreground">Starting score</p>
                  <p className="font-display text-2xl font-semibold">
                    {state.score > 0 ? state.score : 52}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="text-xs text-muted-foreground">Credential level</p>
                  <p className="font-display text-2xl font-semibold">
                    {state.cvi.level ?? accountType}
                  </p>
                </div>
              </div>
              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex-1"
                  onClick={() => goStep(2)}
                >
                  Back
                </Button>
                <Button variant="hero" size="lg" className="flex-[2]" onClick={skipAllToDashboard}>
                  Go to dashboard <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
