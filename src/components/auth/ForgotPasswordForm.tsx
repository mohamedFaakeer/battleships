"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { friendlyAuthError } from "@/lib/auth";
import { authInputClass } from "./styles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ForgotPasswordFormProps {
  /** Where to continue after the password is changed. */
  nextPath: string;
  initialError?: string;
}

/**
 * Requests a password-reset email.
 * Always shows the same confirmation copy so the form can't be used to
 * discover which addresses have accounts.
 */
export function ForgotPasswordForm({ nextPath, initialError }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setFieldError(null);

    const cleanEmail = email.trim();
    if (!EMAIL_RE.test(cleanEmail)) {
      setFieldError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const resetPath = `/auth/reset-password?next=${encodeURIComponent(nextPath)}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(resetPath)}`,
      });

      if (resetError) {
        setError(friendlyAuthError(resetError.message));
        return;
      }
      setSent(true);
    } catch (err) {
      setError(friendlyAuthError((err as Error).message || "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md mx-auto p-6 sm:p-8 space-y-4 text-center">
        <h1 className="text-2xl font-bold text-ocean-50">Check your email</h1>
        <p className="text-ocean-300 text-sm leading-relaxed">
          If an account exists for{" "}
          <span className="text-ocean-100 font-medium break-all">{email.trim()}</span>, we&apos;ve
          sent a link to reset your password.
        </p>
        <p className="text-ocean-500 text-xs">
          The link expires after a short while. Check your spam folder if it doesn&apos;t arrive.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setSent(false)}
            className="w-full"
          >
            Try a different email
          </Button>
          <Link href="/auth/login" className="w-full">
            <Button variant="ghost" size="md" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-ocean-50">Reset your password</h1>
        <p className="text-ocean-400 text-sm mt-1">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {error && (
        <p className="mb-4 text-red-400 text-sm text-center" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? "email-error" : undefined}
            className={cn(authInputClass, fieldError && "border-red-500")}
          />
          {fieldError && (
            <p id="email-error" className="mt-1 text-red-400 text-xs">
              {fieldError}
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" size="md" isLoading={loading} className="w-full">
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-ocean-400 text-sm">
        Remembered it?{" "}
        <Link
          href="/auth/login"
          className="text-ocean-200 font-medium hover:text-ocean-50 underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}
