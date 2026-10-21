import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/auth";

const OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const;
type OtpType = (typeof OTP_TYPES)[number];

function isOtpType(value: string | null): value is OtpType {
  return value !== null && (OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Auth callback — handles confirmation, magic-link and recovery emails.
 * Supports both link styles Supabase can send:
 *   ?code=…            PKCE code exchange
 *   ?token_hash=…&type=…  direct OTP verification
 * Then forwards the player to `next` (default /game).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const next = safeRedirect(searchParams.get("next"));
  const errorDescription = searchParams.get("error_description");

  const isRecovery = typeParam === "recovery";
  const failurePath = isRecovery ? "/auth/forgot-password" : "/auth/login";

  function fail(message: string) {
    const url = new URL(failurePath, origin);
    url.searchParams.set("error", message);
    // Keep the destination so a retried link can still land somewhere useful.
    if (next !== "/game") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  if (errorDescription) return fail(errorDescription);

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    return fail(error.message);
  }

  if (tokenHash && isOtpType(typeParam)) {
    const { error } = await supabase.auth.verifyOtp({ type: typeParam, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
    return fail(error.message);
  }

  return fail("That link is invalid or has expired. Try again.");
}
