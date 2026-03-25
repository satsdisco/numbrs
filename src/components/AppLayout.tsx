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
  Plus,
  Globe,
  Bell,
  Plug,
  Menu,
  ChevronRight,
  Tv2,
  Music2,
} from "lucide-react";

function NumbrsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="120" y="110" width="42" height="175" fill="#fafafa"/>
      <rect x="162" y="110" width="80" height="42" fill="#fafafa"/>
      <rect x="242" y="110" width="42" height="175" fill="#fafafa"/>
      <circle cx="332" cy="283" r="38" fill="#7c3aed"/>
    </svg>
  );
}
import { truncatePubkey } from "@/lib/nostr";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Relay Health", icon: LayoutDashboard },
  { path: "/dashboards", label: "Dashboards", icon: LayoutGrid },
  { path: "/plex", label: "Plex", icon: Tv2 },
  { path: "/jellyfin", label: "Jellyfin", icon: Music2 },
  { path: "/relays", label: "Relays", icon: Radio },
  { path: "/uptime", label: "Uptime", icon: Activity },
  { path: "/alerts", label: "Alerts", icon: Bell },
  { path: "/api-keys", label: "API Keys", icon: Key },
  { path: "/integrations", label: "Integrations", icon: Plug },
  { path: "/explore", label: "Explore", icon: Globe },
];

const bottomNavItems = [
  { path: "/dashboards", label: "Dashboards", icon: LayoutGrid },
  { path: "/relays", label: "Relays", icon: Radio },
  { path: "/uptime", label: "Uptime", icon: Activity },
  { path: "/alerts", label: "Alerts", icon: Bell },
  { path: "/api-keys", label: "API Keys", icon: Key },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  const { data: dashboards } = useQuery({
    queryKey: ["dashboards"],
    queryFn: fetchDashboards,
  });

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <NumbrsLogo className="h-6 w-6" />
        <span className="text-sm font-semibold text-foreground tracking-tight font-mono">numbrs</span>
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

      <div className="space-y-2 border-t border-border p-3">
        <Link to="/relays/new" onClick={onClose}>
          <Button size="sm" className="w-full gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Relay
          </Button>
        </Link>
        <div className="flex items-center justify-between px-1">
          <span className="truncate text-metric-sm text-muted-foreground font-mono">
            {user?.user_metadata?.pubkey
              ? truncatePubkey(user.user_metadata.pubkey)
              : user?.email}
          </span>
          <button
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground transition-colors"
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
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile sidebar Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-56 p-0 flex flex-col bg-sidebar border-r border-border">
          <SidebarContent onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0 pb-16 lg:pb-0 p-6">
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
      </nav>
    </div>
  );
}
