import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Account creation endpoint.
 *
 * The project has email confirmation enabled in Supabase, and hosted GoTrue
 * doesn't expose its config endpoint, so this route creates the account already
 * confirmed using the service-role key — which never leaves the server. The
 * client then signs in with the password it just chose.
 *
 * Server-side validation is authoritative: the client checks are UX only.
 */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return fail(500, "Server auth isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  let body: { email?: unknown; password?: unknown; username?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request body.");
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";

  if (!EMAIL_RE.test(email)) return fail(400, "Enter a valid email address.");
  if (password.length < 6) return fail(400, "Password must be at least 6 characters.");
  if (!USERNAME_RE.test(username)) {
    return fail(400, "Username must be 3–32 characters: letters, numbers or underscores.");
  }

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  // profiles.username is UNIQUE and the signup trigger inserts it — check first
  // so a clash fails with a message instead of an internal error.
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (taken) return fail(409, "That username is already taken.");

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already registered") || message.includes("already been registered")) {
      return fail(409, "An account with that email already exists. Sign in instead.");
    }
    if (message.includes("password")) {
      return fail(400, "Password must be at least 6 characters.");
    }
    if (message.includes("valid email")) {
      return fail(400, "That email address doesn't look valid.");
    }
    return fail(500, error.message);
  }

  if (!data.user) return fail(500, "Could not create the account.");

  return NextResponse.json({ ok: true }, { status: 201 });
}
