import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="bg-gradient-brand glow-ring relative grid size-9 place-items-center rounded-xl">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <path
            d="M12 2.5 4.5 6.2v6c0 4.6 3.1 7.9 7.5 9.3 4.4-1.4 7.5-4.7 7.5-9.3v-6L12 2.5Z"
            fill="none"
            stroke="var(--primary-foreground)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8.6 12.4l2.4 2.4 4.4-4.7"
            fill="none"
            stroke="var(--primary-foreground)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className="font-display text-lg font-semibold tracking-tight">
          Clear<span className="text-gradient">Lend</span>
        </span>
      )}
    </span>
  );
}
