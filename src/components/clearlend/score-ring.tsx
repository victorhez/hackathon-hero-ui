import { cn } from "@/lib/utils";
import { tierForScore } from "@/lib/clearlend/types";

export function ScoreRing({
  score,
  size = 200,
  className,
  label = "Reputation Score",
}: {
  score: number;
  size?: number;
  className?: string;
  label?: string;
}) {
  const stroke = size < 120 ? 8 : 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tier = tierForScore(score);
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="scoreRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--brand)" />
            <stop offset="55%" stopColor="var(--brand-2)" />
            <stop offset="100%" stopColor="var(--brand-3)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#scoreRingGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-gradient font-display font-semibold tabular-nums"
          style={{ fontSize: size / 3.4 }}
        >
          {score}
        </span>
        {size >= 120 && (
          <>
            <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
            <span className="mt-1 text-xs text-muted-foreground">{tier.name} tier</span>
          </>
        )}
      </div>
    </div>
  );
}
