import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Fingerprint,
  Landmark,
  Loader2,
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
  const [busy, setBusy] = useState(false);
  const [bank, setBank] = useState("");
  const [country, setCountry] = useState("");
  const [legalName, setLegalName] = useState("");
  const [accountType, setAccountType] = useState<"Bank-Verified" | "Institution">("Bank-Verified");
  const [consent, setConsent] = useState(false);

  const submitBank = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1200));
    setBusy(false);
    setStep(2);
  };

  const bindWallet = async () => {
    setBusy(true);
    await completeVerification(accountType);
    setBusy(false);
    setStep(3);
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
      <header className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link to="/">
          <Logo />
        </Link>
        <Button variant="ghost" asChild>
          <Link to="/connect">
            <ArrowLeft className="size-4" /> Back to connect
          </Link>
        </Button>
      </header>

      <main className="relative mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        {/* Stepper */}
        <div className="mb-8 flex items-center gap-2">
          {stepsMeta.map((s, i) => (
            <div key={s.title} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl border text-sm transition-colors",
                  i < step && "border-transparent bg-success text-success-foreground",
                  i === step && "bg-gradient-brand border-transparent text-primary-foreground",
                  i > step && "border-border text-muted-foreground",
                )}
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
              <Button variant="hero" size="lg" className="mt-7 w-full" onClick={() => setStep(1)}>
                Start verification <ArrowRight className="size-4" />
              </Button>
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
              <Button
                variant="hero"
                size="lg"
                className="mt-7 w-full"
                disabled={!legalName || !bank || !country || !consent || busy}
                onClick={submitBank}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {busy ? "Contacting institution…" : "Approve with bank"}
              </Button>
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
                  <span className="font-mono text-xs">
                    {state.address ?? "will be created on signing"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-muted-foreground">Credential type</span>
                  <span>{accountType}</span>
                </div>
              </div>
              <Button
                variant="hero"
                size="lg"
                className="mt-7 w-full"
                onClick={bindWallet}
                disabled={busy}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {busy ? "Waiting for signature…" : "Sign & bind wallet"}
              </Button>
            </>
          )}

          {step === 3 && (
            <div className="text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-success/15">
                <Check className="size-8 text-success" />
              </span>
              <h1 className="mt-5 font-display text-2xl font-semibold">Your A-Pass is active</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Credential <span className="font-mono">{state.cvi.passId}</span> is bound to your
                wallet. You start at a baseline Reputation Score and build from there.
              </p>
              <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="text-xs text-muted-foreground">Starting score</p>
                  <p className="font-display text-2xl font-semibold">{state.score}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="text-xs text-muted-foreground">Credential level</p>
                  <p className="font-display text-2xl font-semibold">{state.cvi.level}</p>
                </div>
              </div>
              <Button
                variant="hero"
                size="lg"
                className="mt-7 w-full"
                onClick={() => navigate({ to: "/app" })}
              >
                Go to dashboard <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
