"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { Button, Card, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getRecentMatches } from "@/services/matchService";
import type { MatchHistoryRow } from "@/types";
import Link from "next/link";

/**
 * Match history page — shows past games for the logged-in user.
 */
export default function HistoryPage() {
  const [matches, setMatches] = useState<MatchHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMatches() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError("Sign in to view match history");
          setLoading(false);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await getRecentMatches(supabase as any, user.id, 50);
        setMatches(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadMatches();
  }, []);

  return (
    <AppShell>
      <div className="py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ocean-50">Match History</h1>
            <p className="text-ocean-400 text-sm mt-1">
              Your past games and statistics
            </p>
          </div>
          <Link href="/game">
            <Button variant="primary" size="md">
              + New Game
            </Button>
          </Link>
        </div>

        {loading && (
          <p className="text-ocean-300 text-center py-12">Loading matches...</p>
        )}

        {error && (
          <Card className="p-6 text-center">
            <p className="text-red-400">{error}</p>
            <Link href="/auth/login?redirectedFrom=%2Fhistory" className="mt-4 inline-block">
              <Button variant="primary" size="md">
                Sign In
              </Button>
            </Link>
          </Card>
        )}

        {!loading && !error && matches.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-ocean-300 text-lg mb-4">
              No matches yet — play your first game!
            </p>
            <Link href="/game">
              <Button variant="primary" size="lg">
                Start Playing
              </Button>
            </Link>
          </Card>
        )}

        {!loading && !error && matches.length > 0 && (
          <div className="grid gap-3">
            {matches.map((match) => (
              <Card
                key={match.id}
                className="p-4 hover:bg-ocean-800/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        match.outcome === "win"
                          ? "success"
                          : match.outcome === "loss"
                          ? "danger"
                          : "default"
                      }
                      className="min-w-[4rem] justify-center"
                    >
                      {match.outcome === "win" ? "🏆 WIN" : "💥 LOSS"}
                    </Badge>
                    <div>
                      <p className="text-ocean-100 font-medium text-sm">
                        vs AI ({match.ai_difficulty})
                      </p>
                      <p className="text-ocean-500 text-xs">
                        {match.total_turns} turns • {match.duration_seconds}s
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-ocean-400 text-xs">
                      {new Date(match.created_at).toLocaleDateString()}
                    </span>
                    <Link href={`/replay/${match.id}`}>
                      <Button variant="ghost" size="sm">
                        View Replay
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
