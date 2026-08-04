import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, FileCheck2 } from "lucide-react";
import { PageHeader } from "@/components/clearlend/app-shell";
import { Card } from "@/components/ui/card";
import { useClearLend } from "@/lib/clearlend/store";
import { dateTimeFmt, shortHash, usd } from "@/lib/clearlend/format";

export const Route = createFileRoute("/app/audit")({
  head: () => ({
    meta: [
      { title: "Audit trail — ClearLend" },
      {
        name: "description",
        content:
          "Every deposit, borrow, repayment and withdrawal emits an on-chain proof you can inspect.",
      },
      { property: "og:title", content: "Audit trail — ClearLend" },
      { property: "og:description", content: "Fully auditable, Travel Rule-compliant loan events." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { state } = useClearLend();

  return (
    <>
      <PageHeader
        title="Audit trail"
        subtitle="Loan issuance, collateral movement, repayment and yield events with their verified-asset transfer proofs."
      />
      <Card className="surface-card p-2 sm:p-6">
        {state.audit.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {state.audit.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-4 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent">
                  <FileCheck2 className="size-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{e.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateTimeFmt(e.at)} · {e.chain} · {e.type.replace(/_/g, " ")}
                  </p>
                </div>
                {e.amount !== undefined && (
                  <span className="text-sm font-medium">{usd(e.amount, 2)}</span>
                )}
                <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  {shortHash(e.txHash)} <ExternalLink className="size-3" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
