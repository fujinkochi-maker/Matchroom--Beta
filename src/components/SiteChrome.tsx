import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { isFighterLoggedIn, clearFighterSession, getFighterSession } from "@/lib/discord-auth";
import { NotificationBell } from "./NotificationBell";

type NavLink = { to: string; label: string };
type NavDropdown = { label: string; children: NavLink[] };
type NavItem = NavLink | NavDropdown;

const NAV: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/feed", label: "Feed" },
  { to: "/events", label: "Events" },
  {
    label: "Fighters",
    children: [
      { to: "/champions", label: "Champions" },
      { to: "/boxers", label: "Boxers" },
      { to: "/rankings", label: "Rankings" },
    ],
  },
  {
    label: "Media",
    children: [
      { to: "/news", label: "News" },
      { to: "/videos", label: "Videos" },
    ],
  },
  { to: "/store", label: "Store" },
];

function flatNav() {
  const items: NavLink[] = [];
  for (const n of NAV) {
    if ("to" in n) items.push(n);
    else items.push(...n.children);
  }
  return items;
}

function isActive(path: string, to: string) {
  return to === "/" ? path === "/" : path.startsWith(to);
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const loggedIn = isFighterLoggedIn();
  const session = getFighterSession();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-x flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="bg-primary px-2 py-1 font-display text-lg leading-none tracking-wider text-primary-foreground">
            MATCHROOM
          </span>
          <span className="hidden font-display text-sm uppercase tracking-[0.2em] text-foreground sm:inline">
            Boxing Beta
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            if ("to" in n) {
              const active = isActive(path, n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`relative px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${
                    active ? "text-primary" : "text-foreground hover:text-primary"
                  }`}
                >
                  {n.label}
                  {active && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 bg-primary" />}
                </Link>
              );
            }
            const childActive = n.children.some((c) => isActive(path, c.to));
            return (
              <div key={n.label} className="group relative">
                <button
                  className={`relative flex items-center gap-1 px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${
                    childActive ? "text-primary" : "text-foreground hover:text-primary"
                  }`}
                >
                  {n.label}
                  <ChevronDown className="h-3 w-3" />
                  {childActive && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 bg-primary" />
                  )}
                </button>
                <div className="absolute left-0 top-full min-w-[180px] origin-top scale-y-0 border border-border bg-background shadow-lg opacity-0 transition-all group-hover:scale-y-100 group-hover:opacity-100">
                  <div className="py-1">
                    {n.children.map((c) => {
                      const active = isActive(path, c.to);
                      return (
                        <Link
                          key={c.to}
                          to={c.to}
                          className={`block px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-accent hover:text-primary"
                          }`}
                        >
                          {c.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {loggedIn && <NotificationBell />}
          {loggedIn ? (
            <Link
              to={`/boxers/${session?.username}`}
              className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground lg:inline"
            >
              {session?.displayName}
            </Link>
          ) : (
            <Link
              to="/auth/login"
              className="hidden rounded-md bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 lg:inline"
            >
              Login
            </Link>
          )}
          {loggedIn && (
            <button
              onClick={() => {
                clearFighterSession();
                router.invalidate();
              }}
              className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground lg:inline"
            >
              Logout
            </button>
          )}
        </div>

        <button
          aria-label="Menu"
          className="inline-flex h-10 w-10 items-center justify-center border border-border lg:hidden"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="container-x grid grid-cols-2 gap-1 py-3">
            {flatNav().map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="border border-border px-3 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-surface"
              >
                {n.label}
              </Link>
            ))}
            {loggedIn ? (
              <>
                <Link
                  to={`/boxers/${session?.username}`}
                  onClick={() => setOpen(false)}
                  className="border border-border px-3 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-surface"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    clearFighterSession();
                    router.invalidate();
                  }}
                  className="border border-border px-3 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-surface"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/auth/login"
                onClick={() => setOpen(false)}
                className="border border-border px-3 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-surface"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-foreground text-background">
      <div className="container-x grid gap-10 py-12 md:grid-cols-4">
        <div>
          <div className="inline-block bg-primary px-2 py-1 font-display text-lg leading-none text-primary-foreground">
            MATCHROOM
          </div>
          <p className="mt-3 text-sm text-background/70">
            The home of championship Roblox boxing. Built for Boxing Beta fighters and fans.
          </p>
        </div>
        <FooterCol
          title="Boxing"
          items={[
            ["Champions", "/champions"],
            ["Boxers", "/boxers"],
            ["Rankings", "/rankings"],
            ["Events", "/events"],
          ]}
        />
        <FooterCol
          title="Media"
          items={[
            ["Feed", "/feed"],
            ["News", "/news"],
            ["Videos", "/videos"],
            ["Press", "/news"],
          ]}
        />
        <FooterCol
          title="Shop"
          items={[
            ["Matchroom Store", "/store"],
            ["Champion Collection", "/store"],
            ["Limited Drops", "/store"],
          ]}
        />
      </div>
      <div className="border-t border-background/10">
        <div className="container-x flex flex-col items-start justify-between gap-2 py-5 text-xs text-background/60 md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} Matchroom Boxing Beta. All championship rights reserved.
          </p>
          <p>Fan-made Roblox experience. Not affiliated with Matchroom Sport Ltd.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h4 className="font-display text-sm uppercase tracking-[0.2em] text-primary">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-background/80">
        {items.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="hover:text-primary">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
