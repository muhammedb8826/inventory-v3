"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AuthLoading } from "@/components/auth-loading";
import { useIsClient } from "@/hooks/use-is-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/theme-toggle";
import { useBranding } from "@/components/branding/branding-provider";
import { BoxesIcon } from "lucide-react";
import { errorMessage } from "@/lib/format";

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const { appName } = useBranding();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = useIsClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestedRedirect = searchParams.get('redirect') ?? '/dashboard';
  const redirectTo = requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//') && !requestedRedirect.includes('\\') ? requestedRedirect : '/dashboard';
  const loginMessage =
    searchParams.get("message") === "password-changed"
      ? "Password updated. Sign in with your new password."
      : null;

  useEffect(() => {
    if (!isClient || authLoading) return;
    if (user) {
      router.replace(redirectTo);
    }
  }, [isClient, authLoading, user, router, redirectTo]);

  if (!isClient || authLoading || user) {
    return <AuthLoading />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(79,70,229,0.16), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(129,140,248,0.12), transparent 50%), linear-gradient(180deg, #eef2f6 0%, #e8eef5 100%)",
        }}
      />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative z-10 mb-8 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/25">
          <BoxesIcon className="size-6" />
        </span>
        <div>
          <p className="font-heading text-xl font-semibold tracking-tight text-slate-900">
            {appName}
          </p>
          <p className="text-xs text-slate-500">Stock management system</p>
        </div>
      </div>
      <Card className="relative z-10 w-full max-w-md rounded-2xl border-slate-200/80 shadow-[0_16px_48px_rgba(15,23,42,0.08)]">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to manage inventory, sales, and cash.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {loginMessage ? (
              <p className="rounded-xl bg-teal-500/10 px-3 py-2 text-sm text-teal-800">
                {loginMessage}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? <Spinner className="size-4" /> : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
