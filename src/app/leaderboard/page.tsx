"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout";
import { Badge, Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getLeaderboard } from "@/services/matchService";
import { cn } from "@/lib/utils";

type Entry = Awaited<ReturnType<typeof getLeaderboard>>[number];

/** Gold / silver / bronze rank chips — emoji medals render inconsistently. */
const PODIUM_STYLES = [
  "bg-gradient-to-br from-amber-300 to-amber-600 text-amber-950",
  "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900",
  "bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950",
];

/**
 * Leaderboard — ranks every player who has finished at least one match.
 * Aggregated server-side by the get_leaderboard RPC (win rate, then volume).
 * Middleware redirects guests to /auth/login.
 */
export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Sign in to view the leaderboard.");
        return;
      }
      setUserId(user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await getLeaderboard(supabase as any, 50);
      setEntries(rows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const top = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <AppShell>
      <div className="py-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ocean-50">Leaderboard</h1>
            <p className="text-ocean-400 text-sm mt-1">
              Top commanders ranked by win rate · minimum one completed match
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(true)}
            isLoading={refreshing}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>

        {loading && (
          <div className="grid sm:grid-cols-3 gap-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-ocean-800 bg-ocean-900/40 p-5 h-36 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <Card className="p-8 text-center space-y-4">
            <p className="text-red-400">{error}</p>
            <div className="flex justify-center gap-2">
              <Button variant="primary" size="md" onClick={() => load(true)}>
                Try again
              </Button>
              <Link href="/auth/login?redirectedFrom=%2Fleaderboard">
                <Button variant="secondary" size="md">
                  Sign In
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {!loading && !error && entries.length === 0 && (
          <Card className="p-12 text-center space-y-4">
            <p className="text-4xl" aria-hidden="true">
              🏆
            </p>
            <p className="text-ocean-200 text-lg">No one has finished a match yet.</p>
            <p className="text-ocean-500 text-sm">
              Win a battle and this board will have its first name on it.
            </p>
            <Link href="/game">
              <Button variant="primary" size="md">
                Play a Game
              </Button>
            </Link>
          </Card>
        )}

        {!loading && !error && top.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-3">
            {top.map((entry, index) => {
              const isMe = entry.player_id === userId;
              return (
                <Card
                  key={entry.player_id}
                  className={cn(
                    "p-5 text-center space-y-1",
                    index === 0 && "border-amber-500/60 bg-ocean-900/60",
                    isMe && "ring-2 ring-ocean-400"
                  )}
                >
                  <div
                    className={cn(
                      "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-lg font-extrabold",
                      PODIUM_STYLES[index]
                    )}
                    aria-label={`Rank ${index + 1}`}
                  >
                    {index + 1}
                  </div>
                  <p className="text-ocean-50 font-semibold truncate" title={entry.username}>
                    {entry.username}
                  </p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatRate(entry.win_rate)}%
                  </p>
                  <p className="text-ocean-400 text-xs">
                    {entry.total_games} {entry.total_games === 1 ? "match" : "matches"} ·{" "}
                    {entry.wins}W {entry.losses}L
                  </p>
                  {isMe && (
                    <Badge variant="info" className="mt-1">
                      You
                    </Badge>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {!loading && !error && rest.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left">
              <caption className="sr-only">Leaderboard ranks 4 and below</caption>
              <thead>
                <tr className="text-ocean-400 text-xs uppercase tracking-wide border-b border-ocean-800">
                  <th scope="col" className="py-3 pl-4 pr-2 w-12">
                    #
                  </th>
                  <th scope="col" className="py-3 px-2">
                    Player
                  </th>
                  <th scope="col" className="py-3 px-2 text-right hidden sm:table-cell">
                    Matches
                  </th>
                  <th scope="col" className="py-3 px-2 text-right hidden sm:table-cell">
                    W–L
                  </th>
                  <th scope="col" className="py-3 px-2 text-right">
                    Win Rate
                  </th>
                  <th scope="col" className="py-3 pl-2 pr-4 text-right hidden md:table-cell">
                    Avg Turns
                  </th>
                </tr>
              </thead>
              <tbody>
                {rest.map((entry, index) => {
                  const isMe = entry.player_id === userId;
                  return (
                    <tr
                      key={entry.player_id}
                      className={cn(
                        "border-b border-ocean-800/60 last:border-0",
                        isMe && "bg-ocean-800/40"
                      )}
                    >
                      <td className="py-3 pl-4 pr-2 text-ocean-500 text-sm">{index + 4}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                                       bg-ocean-700 text-xs font-bold text-ocean-100 uppercase"
                            aria-hidden="true"
                          >
                            {entry.username.slice(0, 1)}
                          </span>
                          <span className="text-ocean-100 text-sm truncate" title={entry.username}>
                            {entry.username}
                          </span>
                          {isMe && <Badge variant="info">You</Badge>}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-ocean-300 text-sm hidden sm:table-cell">
                        {entry.total_games}
                      </td>
                      <td className="py-3 px-2 text-right text-ocean-400 text-sm hidden sm:table-cell whitespace-nowrap">
                        {entry.wins}–{entry.losses}
                      </td>
                      <td className="py-3 px-2 text-right text-emerald-300 text-sm font-semibold">
                        {formatRate(entry.win_rate)}%
                      </td>
                      <td className="py-3 pl-2 pr-4 text-right text-ocean-400 text-sm hidden md:table-cell">
                        {formatTurns(entry.avg_turns)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        {!loading && !error && entries.length > 0 && (
          <p className="text-ocean-600 text-xs text-center">
            Matches are only counted for signed-in players — guest games aren&apos;t saved.
          </p>
        )}
      </div>
    </AppShell>
  );
}

/** numeric columns can arrive as strings from Postgres — normalise both. */
function formatRate(value: number | string | null): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1).replace(/\.0$/, "") : "0";
}

function formatTurns(value: number | string | null): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : "—";
}
