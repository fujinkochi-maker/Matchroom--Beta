import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/champions", label: "Champions" },
  { to: "/boxers", label: "Boxers" },
  { to: "/rankings", label: "Rankings" },
  { to: "/events", label: "Events" },
  { to: "/news", label: "News" },
  { to: "/videos", label: "Videos" },
  { to: "/store", label: "Store" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

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
            const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
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
          })}
        </nav>

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
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="border border-border px-3 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-surface"
              >
                {n.label}
              </Link>
            ))}
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
