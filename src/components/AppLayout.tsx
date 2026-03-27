import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchDashboards } from "@/lib/dashboard-api";
import {
  Activity,
  LayoutDashboard,
  LayoutGrid,
  Radio,
  Key,
  LogOut,
  Globe,
  Bell,
  Plug,
  Menu,
  ChevronRight,
  Tv2,
  Music2,
  Bot,
  ExternalLink,
  BookOpen,
  MoreHorizontal,
  Compass,
  Settings,
  Trophy,
} from "lucide-react";

function NumbrsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="120" y="110" width="42" height="175" fill="#fafafa"/>
      <rect x="162" y="110" width="80" height="42" fill="#fafafa"/>
      <rect x="242" y="110" width="42" height="175" fill="#fafafa"/>
      <circle cx="332" cy="283" r="38" fill="hsl(var(--primary))"/>
    </svg>
  );
}
import { pubkeyToNpub } from "@/lib/nostr";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Notifications page and its alt+T shortcut are intentionally not included —
// feature not yet implemented (see issue #5).
const navItems = [
  { path: "/", label: "Relay Health", icon: LayoutDashboard },
  { path: "/dashboards", label: "Dashboards", icon: LayoutGrid },
  { path: "/plex", label: "Plex", icon: Tv2 },
  { path: "/jellyfin", label: "Jellyfin", icon: Music2 },
  { path: "/claude", label: "Claude Usage", icon: Bot },
  { path: "/relays", label: "Relays", icon: Radio },
  { path: "/uptime", label: "Uptime", icon: Activity },
  { path: "/alerts", label: "Alerts", icon: Bell },
  { path: "/api-keys", label: "API Keys", icon: Key },
  { path: "/integrations", label: "Integrations", icon: Plug },
  { path: "/explore", label: "Explore", icon: Globe },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { path: "/settings", label: "Settings", icon: Settings },
];

const bottomNavItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/relays", label: "Relays", icon: Radio },
  { path: "/claude", label: "Claude", icon: Bot },
  { path: "/uptime", label: "Uptime", icon: Activity },
];

const moreNavItems = [
  { path: "/dashboards", label: "Dashboards", icon: LayoutGrid },
  { path: "/plex", label: "Plex", icon: Tv2 },
  { path: "/jellyfin", label: "Jellyfin", icon: Music2 },
  { path: "/alerts", label: "Alerts", icon: Bell },
  { path: "/integrations", label: "Integrations", icon: Plug },
  { path: "/api-keys", label: "API Keys", icon: Key },
  { path: "/explore", label: "Explore", icon: Compass },
  { path: "/settings", label: "Settings", icon: Settings },
];

function SidebarAvatar() {
  const { user } = useAuth();
  const picture = localStorage.getItem("numbrs-nostr-picture");
  const name = localStorage.getItem("numbrs-nostr-name") || user?.user_metadata?.pubkey?.slice(0, 1)?.toUpperCase() || "?";

  return (
    <Link to="/profile" className="shrink-0 rounded-full ring-1 ring-border hover:ring-primary/50 transition-all">
      {picture ? (
        <img
          src={picture}
          alt="Profile"
          className="h-7 w-7 rounded-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
          {name}
        </div>
      )}
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  const { data: dashboards } = useQuery({
    queryKey: ["dashboards"],
    queryFn: fetchDashboards,
  });

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <NumbrsLogo className="h-6 w-6" />
          <span className="text-sm font-semibold text-foreground tracking-tight font-mono">numbrs</span>
        </div>
        <SidebarAvatar />
      </div>

      <nav className="flex-1 overflow-y-auto space-y-0.5 px-2 py-3">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-metric-sm font-medium transition-colors",
              pathname === item.path
                ? "bg-sidebar-accent text-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}

        {/* Pinned dashboards */}
        {dashboards && dashboards.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="px-3 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
              My Dashboards
            </p>
            {dashboards.map((db) => (
              <Link
                key={db.id}
                to={`/dashboards/${db.id}`}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-metric-sm transition-colors group",
                  pathname === `/dashboards/${db.id}`
                    ? "bg-sidebar-accent text-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <ChevronRight className="h-3 w-3 opacity-40 group-hover:opacity-70 shrink-0" />
                <span className="truncate">{db.name}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-border p-3 space-y-1.5">
        <a
          href="https://docs.numbrs.lol"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-metric-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <BookOpen className="h-4 w-4" />
          Docs
          <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
        </a>
        <div className="flex items-center justify-between px-1">
          <span className="truncate text-metric-sm text-muted-foreground font-mono">
            {user?.user_metadata?.pubkey
              ? (() => { const n = pubkeyToNpub(user.user_metadata.pubkey); return n.slice(0, 10) + "…" + n.slice(-6); })()
              : user?.email}
          </span>
          <button
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // True if the current route is one of the "More" items
  const isInMore = moreNavItems.some((item) => pathname === item.path);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 w-56 border-r border-border bg-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile top header */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between h-14 px-4 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <NumbrsLogo className="h-6 w-6" />
          <span className="text-sm font-semibold text-foreground tracking-tight font-mono">numbrs</span>
        </div>
        <div className="flex items-center gap-2">
          <SidebarAvatar />
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile sidebar Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-56 p-0 flex flex-col bg-sidebar border-r border-border">
          <SidebarContent onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0 pb-16 lg:pb-0 p-6 min-w-0 overflow-x-hidden">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-around h-16 border-t border-border bg-sidebar/95 backdrop-blur-sm">
        {bottomNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2 text-[10px] font-medium transition-colors",
              pathname === item.path
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2 text-[10px] font-medium transition-colors",
            isInMore ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="More"
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </nav>

      {/* More bottom sheet */}
      {moreOpen && (
        <div className="lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet */}
          <div
            className="fixed bottom-0 inset-x-0 z-50 bg-sidebar rounded-t-2xl border-t border-border"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            {/* Header */}
            <div className="px-5 py-2">
              <p className="text-sm font-semibold text-foreground">More</p>
            </div>
            {/* 2-column grid */}
            <div className="grid grid-cols-2 gap-2.5 px-4 pb-6 pt-1">
              {moreNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors",
                    pathname === item.path
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-card border-border text-foreground active:bg-muted"
                  )}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
