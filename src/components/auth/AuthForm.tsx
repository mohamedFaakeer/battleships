"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { friendlyAuthError } from "@/lib/auth";
import { authInputClass } from "./styles";

export type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
  /** Where to go after a successful sign-in. */
  redirectTo: string;
  /** Error passed in from the callback route / middleware. */
  initialError?: string;
  /** Informational message, e.g. "Check your email". */
  initialNotice?: string;
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shared authentication form.
 * Login: email + password.
 * Signup: username + email + password, then an email-confirmation state.
 */
export function AuthForm({ mode, redirectTo, initialError, initialNotice }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (isSignup && !USERNAME_RE.test(username.trim())) {
      next.username = "3–32 characters: letters, numbers or underscores.";
    }
    if (!EMAIL_RE.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (password.length < 6) {
      next.password = "Use at least 6 characters.";
    }
    if (isSignup && password !== confirmPassword) {
      next.confirmPassword = "Passwords don't match.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setResendNotice(null);
    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();
    const cleanEmail = email.trim();
    const cleanUsername = username.trim();

    try {
      if (isSignup) {
        const origin = window.location.origin;

        // Primary path: the server route creates an account that's already
        // confirmed, so the player is signed in straight away.
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password, username: cleanUsername }),
        }).catch(() => null);

        if (response?.ok) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (signInError) {
            setError(friendlyAuthError(signInError.message));
            return;
          }
          router.replace(redirectTo);
          router.refresh();
          return;
        }

        const payload = response
          ? ((await response.json().catch(() => null)) as { error?: string } | null)
          : null;

        if (response && response.status < 500 && payload?.error) {
          setError(payload.error);
          return;
        }

        // Route unavailable (5xx / offline) — degrade to Supabase's own sign-up,
        // which asks for email confirmation if the project requires it.
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { username: cleanUsername },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          },
        });

        if (signUpError) {
          setError(friendlyAuthError(signUpError.message));
          return;
        }
        if (data.session) {
          router.replace(redirectTo);
          router.refresh();
          return;
        }
        // Email confirmation required — no session yet.
        setPendingEmail(cleanEmail);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        setError(friendlyAuthError(signInError.message));
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      setError(friendlyAuthError((err as Error).message || "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!pendingEmail || resending) return;
    setResending(true);
    setError(null);
    setResendNotice(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    setResending(false);
    if (resendError) {
      setError(friendlyAuthError(resendError.message));
      return;
    }
    setResendNotice("Confirmation email sent again.");
  }

  // ---- Confirmation state (signup only) ----
  if (pendingEmail) {
    return (
      <Card className="w-full max-w-md mx-auto p-6 sm:p-8 space-y-4 text-center">
        <h1 className="text-2xl font-bold text-ocean-50">Check your email</h1>
        <p className="text-ocean-300 text-sm leading-relaxed">
          We sent a confirmation link to{" "}
          <span className="text-ocean-100 font-medium break-all">{pendingEmail}</span>.
          Click it to activate your account, then sign in.
        </p>

        {resendNotice && (
          <p className="text-emerald-400 text-sm" role="status">
            {resendNotice}
          </p>
        )}
        {error && (
          <p className="text-red-400 text-sm" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={handleResend}
            isLoading={resending}
            className="w-full"
          >
            Resend confirmation email
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              setPendingEmail(null);
              setPassword("");
              setConfirmPassword("");
            }}
            className="w-full"
          >
            Use a different email
          </Button>
        </div>
        <p className="text-ocean-500 text-xs">
          Can&apos;t find it? Check your spam folder.
        </p>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-ocean-50">
          {isSignup ? "Create your account" : "Welcome back, Captain"}
        </h1>
        <p className="text-ocean-400 text-sm mt-1">
          {isSignup
            ? "Save your matches and track your record."
            : "Sign in to save matches and view your history."}
        </p>
      </div>

      {initialNotice && (
        <p className="mb-4 text-emerald-400 text-sm text-center" role="status">
          {initialNotice}
        </p>
      )}
      {error && (
        <p className="mb-4 text-red-400 text-sm text-center" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {isSignup && (
          <div>
            <label htmlFor="username" className="block text-ocean-200 text-sm font-medium mb-1.5">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="captain_ahab"
              disabled={loading}
              aria-invalid={!!fieldErrors.username}
              aria-describedby={fieldErrors.username ? "username-error" : undefined}
              className={cn(authInputClass, fieldErrors.username && "border-red-500")}
            />
            {fieldErrors.username && (
              <p id="username-error" className="mt-1 text-red-400 text-xs">
                {fieldErrors.username}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-ocean-200 text-sm font-medium mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={cn(authInputClass, fieldErrors.email && "border-red-500")}
          />
          {fieldErrors.email && (
            <p id="email-error" className="mt-1 text-red-400 text-xs">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-ocean-200 text-sm font-medium">
              Password
            </label>
            {!isSignup && (
              <Link
                href={`/auth/forgot-password?next=${encodeURIComponent(redirectTo)}`}
                className="text-ocean-400 text-xs hover:text-ocean-200 underline underline-offset-2"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
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

        {isSignup && (
          <div>
            <label htmlFor="confirmPassword" className="block text-ocean-200 text-sm font-medium mb-1.5">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
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
        )}

        <Button type="submit" variant="primary" size="md" isLoading={loading} className="w-full">
          {isSignup ? "Create Account" : "Sign In"}
        </Button>
      </form>

      <p className="mt-6 text-center text-ocean-400 text-sm">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link
          href={
            isSignup
              ? `/auth/login?redirectedFrom=${encodeURIComponent(redirectTo)}`
              : `/auth/signup?redirectedFrom=${encodeURIComponent(redirectTo)}`
          }
          className="text-ocean-200 font-medium hover:text-ocean-50 underline underline-offset-2"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>

      <p className="mt-3 text-center">
        <Link href="/game" className="text-ocean-500 text-xs hover:text-ocean-300">
          Continue as guest instead
        </Link>
      </p>
    </Card>
  );
}
