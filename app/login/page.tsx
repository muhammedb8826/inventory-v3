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
import { Package2 } from "lucide-react";
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
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
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
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-muted/30 p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="mb-8 flex items-center gap-2">
        <Package2 className="size-8" />
        <span className="font-heading text-xl font-semibold">{appName}</span>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Use your account credentials. Default admin: admin@stock.local
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@stock.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            {loginMessage ? (
              <p className="text-sm text-muted-foreground">{loginMessage}</p>
            ) : null}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Spinner className="size-4" /> : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
