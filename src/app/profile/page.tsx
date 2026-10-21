"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout";
import { Badge, Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getProfile, updateProfile, upsertProfile } from "@/services/profileService";
import { getPlayerStats, getRecentMatches, type PlayerStats } from "@/services/matchService";
import { formatDuration } from "@/lib/utils";
import type { MatchHistoryRow, ProfileRow } from "@/types";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

/** Coerces an email prefix / metadata name into a valid username shape. */
function sanitiseUsername(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32);
}

/**
 * Profile page — identity, record and recent matches for the signed-in player.
 * Middleware redirects guests to /auth/login.
 */
export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [matches, setMatches] = useState<MatchHistoryRow[]>([]);
  const [stats, setStats] = useState<PlayerStats>({ wins: 0, losses: 0, draws: 0, total: 0, winRate: 0 });

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setError("Sign in to view your profile.");
          return;
        }
        if (!cancelled) setEmail(user.email ?? "");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabase as any;
        let row = await getProfile(client, user.id);

        // Self-heal: create the profile row if the signup trigger didn't run.
        if (!row) {
          const metaName =
            typeof user.user_metadata?.username === "string" ? user.user_metadata.username : "";
          const fallbackName = sanitiseUsername(
            metaName || user.email?.split("@")[0] || ""
          ) || `captain_${user.id.slice(0, 6)}`;
          row = await upsertProfile(client, {
            id: user.id,
            username: fallbackName,
            avatar_url: null,
          }).catch(() => null);
        }

        const [recent, aggregates] = await Promise.all([
          getRecentMatches(client, user.id, 10),
          getPlayerStats(client, user.id),
        ]);

        if (!cancelled) {
          setProfile(row);
          setNameDraft(row?.username ?? "");
          setMatches(recent);
          setStats(aggregates);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || saving) return;

    const next = nameDraft.trim();
    if (!USERNAME_RE.test(next)) {
      setSaveError("3–32 characters: letters, numbers or underscores.");
      return;
    }
    if (next === profile.username) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = await updateProfile(supabase as any, profile.id, { username: next });
      setProfile(updated);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      const message = (err as Error).message;
      setSaveError(
        message.includes("duplicate key") || message.includes("unique")
          ? "That username is already taken."
          : message
      );
    } finally {
      setSaving(false);
    }
  }



  return (
    <AppShell>
      <div className="py-6 space-y-6">
        {loading && <p className="text-ocean-300 text-center py-12">Loading profile...</p>}

        {!loading && error && (
          <Card className="p-8 text-center space-y-4">
            <p className="text-red-400">{error}</p>
            <Link href="/auth/login?redirectedFrom=%2Fprofile" className="inline-block">
              <Button variant="primary" size="md">
                Sign In
              </Button>
            </Link>
          </Card>
        )}

        {!loading && !error && profile && (
          <>
            {/* Identity */}
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ocean-600
                             text-2xl font-bold text-white uppercase select-none"
                  aria-hidden="true"
                >
                  {profile.username.slice(0, 1)}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
                  <h1 className="text-2xl font-bold text-ocean-50 break-words">
                    {profile.username}
                  </h1>
                  <p className="text-ocean-400 text-sm break-all">{email}</p>
                  <p className="text-ocean-600 text-xs">
                    Joined {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditing((v) => !v);
                      setSaveError(null);
                      setSaved(false);
                      setNameDraft(profile.username);
                    }}
                  >
                    {editing ? "Cancel" : "Edit Name"}
                  </Button>
                </div>
              </div>

              {editing && (
                <form onSubmit={handleRename} className="mt-4 flex flex-col sm:flex-row gap-2">
                  <label htmlFor="username" className="sr-only">
                    Username
                  </label>
                  <input
                    id="username"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={32}
                    className="flex-1 rounded-xl bg-ocean-950/70 border border-ocean-700 px-4 py-2.5
                               text-ocean-50 focus:border-ocean-400 outline-none"
                  />
                  <Button type="submit" variant="primary" size="md" isLoading={saving}>
                    Save
                  </Button>
                </form>
              )}
              {saveError && (
                <p className="mt-2 text-red-400 text-sm" role="alert">
                  {saveError}
                </p>
              )}
              {saved && (
                <p className="mt-2 text-emerald-400 text-sm" role="status">
                  Username updated.
                </p>
              )}
            </Card>

            {/* Record */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 text-center">
                <p className="text-ocean-400 text-xs uppercase tracking-wide">Wins</p>
                <p className="text-emerald-400 text-2xl font-bold">{stats.wins}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-ocean-400 text-xs uppercase tracking-wide">Losses</p>
                <p className="text-red-400 text-2xl font-bold">{stats.losses}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-ocean-400 text-xs uppercase tracking-wide">Win Rate</p>
                <p className="text-ocean-100 text-2xl font-bold">{stats.winRate}%</p>
              </Card>
            </div>

            {/* Recent matches */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-ocean-50 font-semibold text-lg">Recent Matches</h2>
                <Link href="/history" className="text-ocean-400 text-sm hover:text-ocean-200">
                  View all
                </Link>
              </div>

              {matches.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-ocean-300 mb-4">No matches on record yet.</p>
                  <Link href="/game">
                    <Button variant="primary" size="md">
                      Play a Game
                    </Button>
                  </Link>
                </Card>
              ) : (
                <div className="grid gap-2">
                  {matches.map((match) => (
                    <Card key={match.id} className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant={match.outcome === "win" ? "success" : "danger"}>
                            {match.outcome === "win" ? "🏆 WIN" : "💥 LOSS"}
                          </Badge>
                          <div className="min-w-0">
                            <p className="text-ocean-100 text-sm truncate">
                              vs AI ({match.ai_difficulty})
                            </p>
                            <p className="text-ocean-500 text-xs">
                              {match.total_turns} turns
                              {match.duration_seconds
                                ? ` • ${formatDuration(match.duration_seconds)}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <Link href={`/replay/${match.id}`} className="shrink-0">
                          <Button variant="ghost" size="sm">
                            Replay
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
