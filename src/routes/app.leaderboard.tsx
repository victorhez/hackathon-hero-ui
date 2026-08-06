import { createFileRoute } from "@tanstack/react-router";
import { Crown, Trophy } from "lucide-react";
import { PageHeader } from "@/components/clearlend/app-shell";
import { TierBadge } from "@/components/clearlend/tier-badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useClearLend } from "@/lib/clearlend/store";
import { shortAddr, usd } from "@/lib/clearlend/format";
import { tierForScore } from "@/lib/clearlend/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/leaderboard")({
  head: () => ({
    meta: [
      { title: "Reputation leaderboard — ClearLend" },
      {
        name: "description",
        content:
          "See how verified borrowers rank by reputation score, repayment streak and borrowing power.",
      },
      { property: "og:title", content: "Reputation leaderboard — ClearLend" },
      {
        property: "og:description",
        content: "Ranking of verified ClearLend borrowers by reputation score.",
      },
    ],
  }),
  component: LeaderboardPage,
});

const PEERS = [
  { address: "0x7fA2c91b3D5e84Aa0917bE4491cC7D2b6a1F0e33", score: 97, repaid: 41, volume: 1_240_000 },
  { address: "0x2b91Fe07dA4c5188b3aE0d7719cC26aB44f9E102", score: 93, repaid: 33, volume: 890_400 },
  { address: "0xC401aB93e7f2D8140b5eA9C6712dd4471E80B5aa", score: 90, repaid: 28, volume: 615_200 },
  { address: "0x9Ad3e5710bC4f28e19a0dD6634bF11c8a2E7d940", score: 86, repaid: 22, volume: 402_800 },
  { address: "0x51Be2cA7089d3f4416eF0b5528cA97dd1b06E7c2", score: 81, repaid: 19, volume: 288_600 },
  { address: "0xE7c19a0B44d8f2617bA35cD9902fE41b8d5C3706", score: 76, repaid: 14, volume: 176_900 },
  { address: "0x3Fa76B2c05e91dD4418b7aE0cc4519f26aB7d811", score: 71, repaid: 11, volume: 121_400 },
  { address: "0xb802Dd4a17ce593f0e6A18bC7741dd05a9E2F6c4", score: 64, repaid: 8, volume: 74_300 },
];

function LeaderboardPage() {
  const { state } = useClearLend();
  const you = {
    address: state.address ?? "0x0000000000000000000000000000000000000000",
    score: state.score,
    repaid: state.loans.filter((l) => l.status === "repaid").length,
    volume: state.loans.reduce((a, l) => a + l.amount, 0),
    isYou: true,
  };
  const rows = [...PEERS.map((p) => ({ ...p, isYou: false })), you].sort(
    (a, b) => b.score - a.score,
  );
  const yourRank = rows.findIndex((r) => r.isYou) + 1;

  return (
    <>
      <PageHeader
        title="Reputation leaderboard"
        subtitle="Anonymised ranking of A-Pass verified borrowers. Climb the board to unlock lower collateral and cheaper rates."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="surface-card p-5">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Your rank</p>
          <p className="text-gradient font-display mt-1 text-3xl font-semibold">#{yourRank}</p>
          <p className="mt-1 text-xs text-muted-foreground">of {rows.length} verified borrowers</p>
        </Card>
        <Card className="surface-card p-5">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Your score</p>
          <p className="font-display mt-1 text-3xl font-semibold tabular-nums">{state.score}</p>
          <Progress value={state.score} className="mt-3" />
        </Card>
        <Card className="surface-card p-5">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Top score</p>
          <p className="font-display mt-1 flex items-center gap-2 text-3xl font-semibold tabular-nums">
            <Crown className="size-5 text-warning" />
            {rows[0]!.score}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Platinum prime borrower</p>
        </Card>
      </div>

      <Card className="surface-card overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Trophy className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">All-time standings</h2>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((r, i) => (
            <li
              key={r.address + i}
              className={cn(
                "flex flex-wrap items-center gap-4 px-5 py-4",
                r.isYou && "bg-accent/50",
              )}
            >
              <span className="w-8 font-mono text-sm text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 font-mono text-sm">
                {shortAddr(r.address)}
                {r.isYou && (
                  <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    You
                  </span>
                )}
              </span>
              <TierBadge tier={tierForScore(r.score).name} size="sm" />
              <span className="w-24 text-right text-sm text-muted-foreground">
                {r.repaid} repaid
              </span>
              <span className="w-28 text-right text-sm text-muted-foreground">
                {usd(r.volume)}
              </span>
              <span className="font-display w-12 text-right text-sm font-semibold tabular-nums">
                {r.score}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
