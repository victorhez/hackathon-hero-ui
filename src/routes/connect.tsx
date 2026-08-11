import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/clearlend/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClearLend } from "@/lib/clearlend/store";
import { shortAddr } from "@/lib/clearlend/format";
import type { WalletProvider } from "@/lib/clearlend/types";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Connect wallet — ClearLend" },
      {
        name: "description",
        content:
          "Connect MetaMask, WalletConnect or Coinbase Wallet. ClearLend checks your A-Pass credential before granting pool access.",
      },
      { property: "og:title", content: "Connect wallet — ClearLend" },
      {
        property: "og:description",
        content: "Identity-gated access: no verified pass, no entry to the lending pool.",
      },
    ],
  }),
  component: ConnectPage,
});

const wallets: { name: WalletProvider; blurb: string }[] = [
  { name: "MetaMask", blurb: "Browser extension & mobile" },
  { name: "WalletConnect", blurb: "Scan with any mobile wallet" },
  { name: "Coinbase Wallet", blurb: "Coinbase smart wallet & extension" },
];

type Phase = "idle" | "connecting" | "checking" | "denied";

function ConnectPage() {
  const { state, connect } = useClearLend();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [pending, setPending] = useState<WalletProvider | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (state.connected && state.cvi.verified) navigate({ to: "/app" });
  }, [state.connected, state.cvi.verified, navigate]);

  const handleConnect = async (provider: WalletProvider) => {
    setPending(provider);
    setPhase("connecting");
    setErrorMsg(null);
    let resultVerified = false;
    try {
      const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T) =>
        Promise.race([
          p,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
        ]);
      const connectPromise = connect(provider);
      const timeoutFallback = { verified: false, address: "0x" + "0".repeat(40) };
      const result = await withTimeout(connectPromise, 15000, timeoutFallback);
      resultVerified = !!result.verified;
      setPhase("checking");
      await withTimeout(new Promise((r) => setTimeout(r, 500)), 800, undefined as unknown as void);
      if (resultVerified) {
        navigate({ to: "/app" });
      } else {
        setPhase("denied");
      }
    } catch (err: unknown) {
      setPhase("idle");
      setPending(null);
      const msg = err instanceof Error ? err.message : "Could not connect wallet";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      if (!resultVerified) {
        setPending(null);
      }
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
      <header className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link to="/">
          <Logo />
        </Link>
        <Button variant="ghost" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Button>
      </header>

      <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
        {phase === "denied" ? (
          <Card className="surface-card p-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/15">
              <ShieldAlert className="size-7 text-destructive" />
            </span>
            <h1 className="mt-5 font-display text-2xl font-semibold">Access denied</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              No valid A-Pass credential was found for{" "}
              <span className="font-mono">{shortAddr(state.address)}</span>. ClearLend is an
              identity-gated pool — anonymous wallets cannot borrow or lend here.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button variant="hero" size="lg" asChild>
                <Link to="/verify">
                  Get verified <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => setPhase("idle")}>
                Try another wallet
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="surface-card p-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-accent">
              <ShieldCheck className="size-6 text-primary" />
            </span>
            <h1 className="mt-5 font-display text-2xl font-semibold">Connect your wallet</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We check for a valid A-Pass credential on every login — not just the first one.
            </p>

            {errorMsg && (
              <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMsg}
              </div>
            )}

            <div className="mt-6 space-y-3">
              {wallets.map((w) => (
                <button
                  key={w.name}
                  disabled={phase !== "idle"}
                  onClick={() => handleConnect(w.name)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-border bg-background/60 p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent/50 disabled:opacity-60"
                >
                  <span className="bg-gradient-brand grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold text-primary-foreground">
                    {w.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{w.name}</span>
                    <span className="block text-xs text-muted-foreground">{w.blurb}</span>
                  </span>
                  {pending === w.name && phase !== "idle" ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <ArrowRight className="size-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>

            {phase !== "idle" && (
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                {phase === "connecting"
                  ? "Requesting signature from wallet…"
                  : "Checking A-Pass credential on-chain…"}
              </div>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground">
              New here?{" "}
              <Link to="/verify" className="text-primary hover:underline">
                Start identity verification
              </Link>
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
