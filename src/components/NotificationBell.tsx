import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getFighterSession } from "@/lib/discord-auth";
import { getNotifications, markNotificationsRead } from "@/lib/admin.server";
import type { Notification } from "@/data/types";

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = getFighterSession();
    if (!session) return;

    const fetchNotifs = async () => {
      try {
        const result = await getNotifications({ data: { token: session.token } });
        setNotifs(result.notifications as Notification[]);
      } catch {
        // best-effort
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const handleOpen = async () => {
    setOpen((o) => !o);
    if (!open && unreadCount > 0) {
      const session = getFighterSession();
      if (session) {
        try {
          await markNotificationsRead({ data: { token: session.token } });
          setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch {
          // best-effort
        }
      }
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-32px)] origin-top-right scale-y-100 opacity-100 transition-all duration-150 rounded-lg border border-border bg-background shadow-lg">
          <div className="border-b border-border px-4 py-2">
            <p className="text-sm font-semibold">Notifications</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              notifs.map((n) => (
                <Link
                  key={n.id}
                  to="/feed"
                  className={`block border-b border-border px-4 py-3 text-sm hover:bg-accent ${n.read ? "" : "bg-primary/5"}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="font-medium text-foreground">{n.actorDisplayName}</span>{" "}
                  <span className="text-foreground">
                    {n.type === "tag" ? "tagged you in a post" : "liked your post"}
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatTime(n.createdAt)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}
