import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Activity, LayoutDashboard, Radio, Key, LogOut, Plus } from "lucide-react";
import { truncatePubkey } from "@/lib/nostr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/relays", label: "Relays", icon: Radio },
  { path: "/api-keys", label: "API Keys", icon: Key },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-semibold text-foreground tracking-tight">NUMBERS</span>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
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
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          <Link to="/relays/new">
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
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 p-6">{children}</main>
    </div>
  );
}
