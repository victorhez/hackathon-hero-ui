import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  BadgeCheck,
  BarChart3,
  Bell,
  Gauge,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "./logo";
import { TierBadge } from "./tier-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClearLend } from "@/lib/clearlend/store";
import { shortAddr, tokens } from "@/lib/clearlend/format";
import { CHAINS, tierForScore } from "@/lib/clearlend/types";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/score", label: "Reputation", icon: Gauge },
  { to: "/app/borrow", label: "Borrow", icon: HandCoins },
  { to: "/app/loans", label: "My Loans", icon: ArrowDownToLine },
  { to: "/app/lend", label: "Lend", icon: Wallet },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/app/audit", label: "Audit Trail", icon: ScrollText },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/settings", label: "Settings", icon: Settings },
];


export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, disconnect, setChain } = useClearLend();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = state.notifications.filter((n) => !n.read).length;
  const tier = tierForScore(state.score);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/">
            <Logo />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.to, item.exact)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "size-4",
                  isActive(item.to, item.exact) ? "text-primary" : "text-muted-foreground",
                )}
              />
              {item.label}
              {item.label === "Notifications" && unread > 0 && (
                <span className="bg-gradient-brand ml-auto grid size-5 place-items-center rounded-full text-[11px] font-semibold text-primary-foreground">
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="surface-card m-3 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-success">
            <BadgeCheck className="size-4" />
            A-Pass active
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground">{state.cvi.passId}</p>
          <p className="mt-3 text-xs text-muted-foreground">Wallet balance</p>
          <p className="font-display text-sm font-semibold">{tokens(state.balances.aUSDC)}</p>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>

          <div className="hidden items-center gap-2 md:flex">
            <TierBadge tier={tier.name} size="sm" />
            <span className="text-sm text-muted-foreground">Score {state.score}/100</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Select value={state.chain} onValueChange={setChain}>
              <SelectTrigger className="w-[140px]">
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

            <Link to="/app/notifications" className="relative">
              <Button variant="outline" size="icon" aria-label="Notifications">
                <Bell className="size-4" />
              </Button>
              {unread > 0 && (
                <span className="bg-gradient-brand absolute -top-1 -right-1 grid size-4 place-items-center rounded-full text-[10px] font-semibold text-primary-foreground">
                  {unread}
                </span>
              )}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 font-mono text-xs">
                  <span className="size-2 rounded-full bg-success" />
                  {shortAddr(state.address)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {state.provider} · {state.chain}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/app/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/app/audit">Audit trail</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={disconnect} className="text-destructive">
                  <LogOut className="size-4" /> Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
