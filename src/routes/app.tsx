import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/clearlend/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClearLend } from "@/lib/clearlend/store";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { state, hydrated, recheckCvi, disconnect } = useClearLend();
  const navigate = useNavigate();
  const [sessionChecked, setSessionChecked] = useState(false);
  const gated = hydrated && (!state.connected || !state.cvi.verified);

  useEffect(() => {
    if (!hydrated) return undefined;
    if (!state.connected || !state.address) {
      setSessionChecked(true);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        type EIP1193 = {
          request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        };
        const w = window as unknown as {
          ethereum?: EIP1193;
        };
        if (!w.ethereum) {
          disconnect();
          if (!cancelled) navigate({ to: "/connect" });
          return;
        }
        const accounts = (await w.ethereum.request({
          method: "eth_accounts",
        })) as string[];
        const found =
          Array.isArray(accounts) &&
          accounts.some(
            (a) => typeof a === "string" && a.toLowerCase() === state.address?.toLowerCase(),
          );
        if (!found) {
          disconnect();
          if (!cancelled) navigate({ to: "/connect" });
          return;
        }
      } catch {
        /* ignore probe errors — keep session if wallet probe fails */
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, state.connected, state.address, disconnect, navigate]);

  useEffect(() => {
    if (hydrated && sessionChecked && state.cvi.verified && !state.cvi.lastCheckedAt) {
      void recheckCvi();
    }
  }, [hydrated, sessionChecked, state.cvi.verified, state.cvi.lastCheckedAt, recheckCvi]);

  useEffect(() => {
    if (!gated) return undefined;
    const t = setTimeout(() => navigate({ to: "/connect" }), 2200);
    return () => clearTimeout(t);
  }, [gated, navigate]);

  if (!hydrated || !sessionChecked) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (gated) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <Card className="surface-card max-w-md p-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/15">
            <ShieldAlert className="size-7 text-destructive" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold">Identity gate</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ClearLend requires a connected wallet with a valid A-Pass credential. Redirecting you to
            the identity gate…
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button variant="hero" asChild>
              <Link to="/connect">Connect wallet</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/verify">Get an A-Pass</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
