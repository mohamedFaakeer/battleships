/**
 * Auth helpers shared by the auth pages, the callback route and the navbar.
 */

/**
 * Only allow same-origin, absolute-path redirects.
 * Blocks protocol-relative ("//evil.com") and absolute URLs (open redirects).
 */
export function safeRedirect(value: string | null | undefined, fallback = "/game"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

/** Turns Supabase auth errors into copy a player can act on. */
export function friendlyAuthError(message: string): string {
  const text = message.toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (text.includes("email not confirmed")) {
    return "Confirm your email first — check your inbox for the verification link.";
  }
  if (text.includes("already registered") || text.includes("already been registered")) {
    return "An account with that email already exists. Try signing in instead.";
  }
  if (text.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (text.includes("different from the old password")) {
    return "Choose a password you haven't used before.";
  }
  if (text.includes("unable to validate email") || text.includes("invalid email")) {
    return "That email address doesn't look valid.";
  }
  if (text.includes("is invalid")) {
    return "That email address can't receive mail — check it and try again.";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Too many attempts — wait a minute and try again.";
  }
  if (text.includes("signups not allowed") || text.includes("signup is disabled")) {
    return "Sign-ups are currently disabled for this project.";
  }
  return message;
}
