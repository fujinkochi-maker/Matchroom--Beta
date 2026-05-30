import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Calendar, Newspaper, Video, Package, ArrowUpRight } from "lucide-react";
import {
  loadDataFromSupabase,
  FIGHTERS,
  EVENTS,
  ARTICLES,
  VIDEOS,
  PRODUCTS,
} from "@/data/fighters";

export const Route = createFileRoute("/admin/")({
  loader: async () => {
    await loadDataFromSupabase();
  },
  component: AdminDashboard,
});

function AdminDashboard() {
  const cards = [
    { label: "Fighters", count: FIGHTERS.length, to: "/admin/fighters", icon: Users },
    { label: "Events", count: EVENTS.length, to: "/admin/events", icon: Calendar },
    { label: "Articles", count: ARTICLES.length, to: "/admin/articles", icon: Newspaper },
    { label: "Videos", count: VIDEOS.length, to: "/admin/videos", icon: Video },
    { label: "Products", count: PRODUCTS.length, to: "/admin/products", icon: Package },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl uppercase tracking-wider">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your Matchroom Boxing Beta content.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group rounded-lg border border-border bg-background p-5 transition-shadow hover:shadow-card"
          >
            <div className="flex items-center justify-between">
              <c.icon className="h-5 w-5 text-muted-foreground" />
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-4 font-display text-3xl">{c.count}</p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
