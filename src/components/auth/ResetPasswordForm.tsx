"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { friendlyAuthError } from "@/lib/auth";
import { authInputClass } from "./styles";

interface ResetPasswordFormProps {
  /** Where to continue after a successful reset. */
  nextPath: string;
}

type Status = "checking" | "ready" | "invalid" | "done";

/**
 * Set-new-password screen reached from a recovery link.
 * The recovery link establishes a session first, so this only works for
 * signed-in users — otherwise we surface an expired-link state.
 */
export function ResetPasswordForm({ nextPath }: ResetPasswordFormProps) {
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    // The callback route normally creates the session before we land here.
    // If it hasn't propagated yet, retry briefly before declaring the link dead.
    async function check(attempt = 0) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (user) {
        setEmail(user.email ?? null);
        setStatus("ready");
        return;
      }
      if (attempt < 3) {
        window.setTimeout(() => check(attempt + 1), 400);
        return;
      }
      setStatus("invalid");
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || status !== "ready") return;

    setError(null);
    const next: Record<string, string> = {};
    if (password.length < 6) next.password = "Use at least 6 characters.";
    if (password !== confirmPassword) next.confirmPassword = "Passwords don't match.";
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(friendlyAuthError(updateError.message));
        return;
      }
      // Keep this session, drop any others that might be compromised.
      await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
      setStatus("done");
    } catch (err) {
      setError(friendlyAuthError((err as Error).message || "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking") {
    return (
      <Card className="w-full max-w-md mx-auto p-6 sm:p-8 text-center">
        <p className="text-ocean-300 py-6">Verifying your reset link…</p>
      </Card>
    );
  }

  if (status === "invalid") {
    return (
      <Card className="w-full max-w-md mx-auto p-6 sm:p-8 space-y-4 text-center">
        <h1 className="text-2xl font-bold text-ocean-50">Reset link expired</h1>
        <p className="text-ocean-300 text-sm leading-relaxed">
          This password reset link is no longer valid. Request a new one and try again.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/auth/forgot-password" className="w-full">
            <Button variant="primary" size="md" className="w-full">
              Request a new link
            </Button>
          </Link>
          <Link href="/auth/login" className="w-full">
            <Button variant="ghost" size="md" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (status === "done") {
    return (
      <Card className="w-full max-w-md mx-auto p-6 sm:p-8 space-y-4 text-center">
        <h1 className="text-2xl font-bold text-emerald-400">Password updated</h1>
        <p className="text-ocean-300 text-sm leading-relaxed">
          You&apos;re signed in{email ? ` as ${email}` : ""}. Use your new password next time.
        </p>
        <Link href={nextPath} className="block pt-2">
          <Button variant="primary" size="md" className="w-full">
            Continue
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-ocean-50">Choose a new password</h1>
        <p className="text-ocean-400 text-sm mt-1">
          {email ? `Setting a new password for ${email}.` : "Setting a new password."}
        </p>
      </div>

      {error && (
        <p className="mb-4 text-red-400 text-sm text-center" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="block text-ocean-200 text-sm font-medium mb-1.5">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            disabled={loading}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            className={cn(authInputClass, fieldErrors.password && "border-red-500")}
          />
          {fieldErrors.password && (
            <p id="password-error" className="mt-1 text-red-400 text-xs">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-ocean-200 text-sm font-medium mb-1.5">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your new password"
            disabled={loading}
            aria-invalid={!!fieldErrors.confirmPassword}
            aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
            className={cn(authInputClass, fieldErrors.confirmPassword && "border-red-500")}
          />
          {fieldErrors.confirmPassword && (
            <p id="confirm-password-error" className="mt-1 text-red-400 text-xs">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" size="md" isLoading={loading} className="w-full">
          Update password
        </Button>
      </form>
    </Card>
  );
}
