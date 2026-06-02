import { useEffect, type ReactNode } from "react";
import { Link, useRouter, useLocation } from "@tanstack/react-router";
import {
  Shield,
  LayoutDashboard,
  Users,
  Calendar,
  Newspaper,
  Video,
  Package,
  MessageSquare,
  LogOut,
  Trophy,
} from "lucide-react";

const SIDEBAR = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/fighters", label: "Fighters", icon: Users },
  { to: "/admin/rankings", label: "Rankings", icon: Trophy },
  { to: "/admin/events", label: "Events", icon: Calendar },
  { to: "/admin/articles", label: "Articles", icon: Newspaper },
  { to: "/admin/videos", label: "Videos", icon: Video },
  { to: "/admin/posts", label: "Feed Posts", icon: MessageSquare },
  { to: "/admin/products", label: "Products", icon: Package },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const location = useLocation();
  const token = getAdminToken();

  useEffect(() => {
    if (!token && location.pathname !== "/admin/login") {
      router.navigate({ to: "/admin/login" });
    }
  }, [token, location.pathname, router]);

  if (!token && location.pathname !== "/admin/login") return null;

  const handleLogout = () => {
    clearAdminToken();
    router.navigate({ to: "/admin/login" });
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-background lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-display text-sm uppercase tracking-wider">Admin Panel</span>
        </div>
        <nav className="p-3">
          {SIDEBAR.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              activeOptions={item.exact ? { exact: true } : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display text-sm uppercase tracking-wider">Admin Panel</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}

export const NAV = SIDEBAR;
