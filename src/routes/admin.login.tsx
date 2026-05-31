import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Lock } from "lucide-react";
import { adminLogin } from "@/lib/admin.server";
import { setAdminToken } from "@/lib/admin-auth";
export const Route = createFileRoute("/admin/login")({ component: AdminLogin });
function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await adminLogin({ data: { password } });
      setAdminToken(result.token);
      router.navigate({ to: "/admin" });
    } catch (err) {
      setError((err as Error).message || "Login failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      {" "}
      <div className="w-full max-w-sm">
        {" "}
        <div className="rounded-lg border border-border bg-background p-8 shadow-sm">
          {" "}
          <div className="mb-6 text-center">
            {" "}
            <Shield className="mx-auto h-8 w-8 text-primary" />{" "}
            <h1 className="mt-3 font-display text-xl uppercase tracking-wider">Admin Login</h1>{" "}
          </div>{" "}
          <form onSubmit={handleSubmit} className="space-y-4">
            {" "}
            <div>
              {" "}
              <label className="text-sm font-medium">Password</label>{" "}
              <div className="relative mt-1">
                {" "}
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />{" "}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter admin password"
                  autoFocus
                />{" "}
              </div>{" "}
            </div>{" "}
            {error && <p className="text-sm text-destructive">{error}</p>}{" "}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
            >
              {" "}
              {busy ? "Signing in..." : "Sign in"}{" "}
            </button>{" "}
          </form>{" "}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {" "}
            <Link to="/" className="hover:text-primary">
              {" "}
              Back to site{" "}
            </Link>{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
