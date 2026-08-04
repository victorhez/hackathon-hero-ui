import { cn } from "@/lib/utils";
import { TIERS, type TierName } from "@/lib/clearlend/types";

const styles: Record<TierName, string> = {
  Platinum: "bg-platinum/15 text-platinum border-platinum/40",
  Gold: "bg-gold/15 text-gold border-gold/40",
  Silver: "bg-silver/15 text-silver border-silver/40",
  Bronze: "bg-bronze/15 text-bronze border-bronze/40",
  Unranked: "bg-unranked/15 text-unranked border-unranked/40",
};

const dots: Record<TierName, string> = {
  Platinum: "bg-platinum",
  Gold: "bg-gold",
  Silver: "bg-silver",
  Bronze: "bg-bronze",
  Unranked: "bg-unranked",
};

export function TierBadge({
  tier,
  className,
  size = "md",
}: {
  tier: TierName;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium",
        styles[tier],
        size === "sm" && "px-2.5 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        size === "lg" && "px-4 py-1.5 text-base",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dots[tier])} />
      {tier}
    </span>
  );
}

export function TierTable({ activeTier }: { activeTier?: TierName }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-3 pr-4 font-medium">Score</th>
            <th className="py-3 pr-4 font-medium">Tier</th>
            <th className="py-3 pr-4 font-medium">Collateral</th>
            <th className="py-3 pr-4 font-medium">Limit</th>
            <th className="py-3 font-medium">Interest</th>
          </tr>
        </thead>
        <tbody>
          {TIERS.map((t) => (
            <tr
              key={t.name}
              className={cn(
                "border-b border-border/60 last:border-0",
                activeTier === t.name && "bg-accent/40",
              )}
            >
              <td className="py-3 pr-4 whitespace-nowrap tabular-nums">
                {t.min} – {t.max}
              </td>
              <td className="py-3 pr-4">
                <TierBadge tier={t.name} size="sm" />
              </td>
              <td className="py-3 pr-4 whitespace-nowrap">{t.collateralLabel}</td>
              <td className="py-3 pr-4 whitespace-nowrap">
                {t.limit >= 1000 ? `Up to $${(t.limit / 1000).toFixed(0)}k` : "Micro only"}
              </td>
              <td className="py-3 whitespace-nowrap">{t.rateLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
