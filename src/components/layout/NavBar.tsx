"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Play",        href: "/game" },
  { label: "History",     href: "/history" },
  { label: "Grids",       href: "/grids" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Profile",     href: "/profile" },
];

interface SessionUser {
  email: string | null;
  name: string;
}

/**
 * Top navigation bar.
 * Responsive: desktop links + account controls, mobile hamburger panel.
 * Reads the Supabase session so sign-in state is always current.
 */
export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(toSessionUser(data.user));
      setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(toSessionUser(session?.user));
      setReady(true);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setSigningOut(false);
    setMenuOpen(false);
    router.replace("/");
    router.refresh();
  }

  const signInHref = `/auth/login?redirectedFrom=${encodeURIComponent(pathname || "/game")}`;

  return (
    <header className="sticky top-0 z-50 w-full bg-ocean-950/90 backdrop-blur-sm border-b border-ocean-800 pt-safe">
      <nav
        aria-label="Main navigation"
        className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8 max-w-screen-xl mx-auto"
      >
        {/* Logo / brand */}
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 text-ocean-50 font-bold text-lg",
            "transition-opacity hover:opacity-80 focus-visible:opacity-80"
          )}
          aria-label="Battleships — go to home"
        >
          <span aria-hidden="true">⚓</span>
          <span className="hidden sm:inline">Battleships</span>
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-1" role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(pathname, item.href)
                    ? "text-ocean-50 bg-ocean-800"
                    : "text-ocean-300 hover:text-ocean-50 hover:bg-ocean-800"
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Account controls */}
        <div className="hidden md:flex items-center gap-2">
          {!ready ? (
            <span className="w-24 h-8 rounded-lg bg-ocean-800/40 animate-pulse" aria-hidden="true" />
          ) : user ? (
            <>
              <Link
                href="/profile"
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
                  "text-ocean-200 hover:text-ocean-50 hover:bg-ocean-800 transition-colors"
                )}
                title={user.email ?? user.name}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-ocean-600 text-[11px] font-bold text-white uppercase"
                >
                  {user.name.slice(0, 1)}
                </span>
                <span className="max-w-[10rem] truncate">{user.name}</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-ocean-700
                           text-ocean-300 hover:text-ocean-50 hover:bg-ocean-800 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
            </>
          ) : (
            <Link
              href={signInHref}
              className="px-4 py-1.5 rounded-lg text-sm font-medium border border-ocean-600
                         text-ocean-200 hover:text-ocean-50 hover:bg-ocean-800 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="md:hidden p-2 rounded-lg text-ocean-300 hover:text-ocean-50 hover:bg-ocean-800 transition-colors"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile panel */}
      {menuOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-ocean-800 bg-ocean-950/95 px-4 py-3">
          <ul className="flex flex-col gap-1" role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={cn(
                    "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive(pathname, item.href)
                      ? "text-ocean-50 bg-ocean-800"
                      : "text-ocean-300 hover:text-ocean-50 hover:bg-ocean-800"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-3 pt-3 border-t border-ocean-800">
            {ready && user ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-ocean-300 text-sm truncate">{user.name}</span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border border-ocean-700
                             text-ocean-300 hover:text-ocean-50 hover:bg-ocean-800 transition-colors
                             disabled:opacity-50"
                >
                  {signingOut ? "Signing out…" : "Sign Out"}
                </button>
              </div>
            ) : (
              <Link
                href={signInHref}
                className="block text-center px-4 py-2 rounded-lg text-sm font-medium
                           border border-ocean-600 text-ocean-200 hover:text-ocean-50 hover:bg-ocean-800"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/game") return pathname === "/game" || pathname.startsWith("/replay");
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Minimal structural type — avoids importing Supabase's User into this file.
function toSessionUser(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined): SessionUser | null {
  if (!user) return null;
  const metaName = user.user_metadata?.username;
  const name =
    (typeof metaName === "string" && metaName.trim()) ||
    user.email?.split("@")[0] ||
    "Captain";
  return { email: user.email ?? null, name };
}
