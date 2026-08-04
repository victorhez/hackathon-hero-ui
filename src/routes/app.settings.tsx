import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, LogOut, RefreshCw, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/clearlend/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClearLend } from "@/lib/clearlend/store";
import { dateFmt, dateTimeFmt } from "@/lib/clearlend/format";
import { CHAINS } from "@/lib/clearlend/types";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ClearLend" },
      {
        name: "description",
        content: "Manage your wallet connection, active chain, A-Pass credential and demo state.",
      },
      { property: "og:title", content: "Settings — ClearLend" },
      { property: "og:description", content: "Wallet, credential and network preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { state, setChain, setRole, recheckCvi, disconnect, reset } = useClearLend();

  return (
    <>
      <PageHeader title="Settings" subtitle="Wallet, credential and network preferences." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="surface-card p-7">
          <h2 className="font-display text-lg font-semibold">Wallet</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="truncate font-mono text-xs">{state.address}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Provider</dt>
              <dd>{state.provider}</dd>
            </div>
          </dl>
          <div className="mt-5 grid gap-3">
            <div className="grid gap-2">
              <span className="text-xs text-muted-foreground">Active chain</span>
              <Select value={state.chain} onValueChange={setChain}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAINS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <span className="text-xs text-muted-foreground">Primary role</span>
              <Select value={state.role} onValueChange={(v) => setRole(v as "borrower" | "lender")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrower">Borrower</SelectItem>
                  <SelectItem value="lender">Lender</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" className="mt-5 w-full" onClick={disconnect}>
            <LogOut className="size-4" /> Disconnect wallet
          </Button>
        </Card>

        <Card className="surface-card p-7">
          <div className="flex items-center gap-2">
            <BadgeCheck className="size-4 text-success" />
            <h2 className="font-display text-lg font-semibold">A-Pass credential</h2>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pass ID</dt>
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
              <dt className="text-muted-foreground">Last session check</dt>
              <dd>{state.cvi.lastCheckedAt ? dateTimeFmt(state.cvi.lastCheckedAt) : "—"}</dd>
            </div>
          </dl>
          <Button variant="soft" className="mt-5 w-full" onClick={recheckCvi}>
            <RefreshCw className="size-4" /> Re-verify now
          </Button>
        </Card>

        <Card className="surface-card p-7 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Demo controls</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Reset all local state to walk through the full journey again from the identity gate.
          </p>
          <Button variant="outline" className="mt-5" onClick={reset}>
            <RotateCcw className="size-4" /> Reset demo state
          </Button>
        </Card>
      </div>
    </>
  );
}
