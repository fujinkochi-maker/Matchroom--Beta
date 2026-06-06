import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { Menu, ChevronDown } from "lucide-react";
import { isFighterLoggedIn, clearFighterSession, getFighterSession } from "@/lib/discord-auth";
import { NotificationBell } from "./NotificationBell";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "@/components/ui/sheet";

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
  return to === "/" ? path === "/" : path === to || path.startsWith(to + "/");
}

export function SiteHeader() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const loggedIn = isFighterLoggedIn();
  const session = getFighterSession();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black text-white">
      <div className="container-x flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.png" alt="Matchroom" className="h-8 w-auto" />
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
                    active ? "text-white" : "text-white/70 hover:text-white"
                  }`}
                >
                  {n.label}
                  {active && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 bg-white" />}
                </Link>
              );
            }
            const childActive = n.children.some((c) => isActive(path, c.to));
            return (
              <div key={n.label} className="group relative">
                <button
                  className={`relative flex items-center gap-1 px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${
                    childActive ? "text-white" : "text-white/70 hover:text-white"
                  }`}
                >
                  {n.label}
                  <ChevronDown className="h-3 w-3" />
                  {childActive && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 bg-white" />
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
              to="/boxers/$username"
              params={{ username: session?.username ?? "" }}
              className="hidden text-xs font-semibold uppercase tracking-wider text-white/70 hover:text-white lg:inline"
            >
              {session?.displayName}
            </Link>
          ) : (
            <Link
              to="/auth/login"
              className="hidden rounded-md bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-black hover:opacity-90 lg:inline"
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
              className="hidden text-xs font-semibold uppercase tracking-wider text-white/70 hover:text-white lg:inline"
            >
              Logout
            </button>
          )}
        </div>

        {loggedIn && (
          <Link
            to="/boxers/$username"
            params={{ username: session?.username ?? "" }}
            className="flex items-center gap-2 lg:hidden"
          >
            {session?.image ? (
              <img src={session.image} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold uppercase">
                {session?.displayName?.charAt(0) ?? "?"}
              </div>
            )}
          </Link>
        )}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <button
                aria-label="Menu"
                className="inline-flex h-10 w-10 items-center justify-center border border-border"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0 pt-14 text-foreground">
              <div className="border-b border-border px-4 pb-3">
                <Link to="/" className="flex items-center gap-2">
                  <img src="/favicon.png" alt="Matchroom" className="h-8 w-auto" />
                </Link>
              </div>
              <nav className="flex flex-col gap-1 p-4">
                {flatNav().map((n) => {
                  const active = isActive(path, n.to);
                  return (
                    <SheetClose key={n.to} asChild>
                      <Link
                        to={n.to}
                        className={`border border-border px-3 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
                          active ? "bg-primary/10 text-primary" : "hover:bg-surface"
                        }`}
                      >
                        {n.label}
                      </Link>
                    </SheetClose>
                  );
                })}
                {loggedIn ? (
                  <>
                    <SheetClose asChild>
                      <Link
                        to="/boxers/$username"
                        params={{ username: session?.username ?? "" }}
                        className="border border-border px-3 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-surface"
                      >
                        Profile
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <button
                        onClick={() => {
                          clearFighterSession();
                          router.invalidate();
                        }}
                        className="w-full border border-border px-3 py-3 text-left text-sm font-semibold uppercase tracking-wider hover:bg-surface"
                      >
                        Logout
                      </button>
                    </SheetClose>
                  </>
                ) : (
                  <SheetClose asChild>
                    <Link
                      to="/auth/login"
                      className="border border-border px-3 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-surface"
                    >
                      Login
                    </Link>
                  </SheetClose>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
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
            ["Interviews", "/news"],
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
