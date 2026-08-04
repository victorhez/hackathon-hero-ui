import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck, Info, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/clearlend/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClearLend } from "@/lib/clearlend/store";
import { timeAgo } from "@/lib/clearlend/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — ClearLend" },
      {
        name: "description",
        content:
          "Loan due reminders, score changes, tier upgrades and lender yield alerts in one feed.",
      },
      { property: "og:title", content: "Notifications — ClearLend" },
      { property: "og:description", content: "Never miss a due date or a tier change." },
    ],
  }),
  component: NotificationsPage,
});

const icons = { info: Info, success: CheckCheck, warning: TriangleAlert };

function NotificationsPage() {
  const { state, markAllRead } = useClearLend();

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Due-date warnings, score milestones, tier changes and yield updates."
        action={
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        }
      />
      {state.notifications.length === 0 ? (
        <Card className="surface-card p-12 text-center">
          <Bell className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">You're all caught up.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {state.notifications.map((n) => {
            const Icon = icons[n.kind];
            return (
              <Card
                key={n.id}
                className={cn("surface-card flex gap-4 p-5", !n.read && "border-primary/40")}
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl",
                    n.kind === "success" && "bg-success/15 text-success",
                    n.kind === "warning" && "bg-warning/15 text-warning",
                    n.kind === "info" && "bg-accent text-primary",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.read && <span className="size-1.5 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{timeAgo(n.at)}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
