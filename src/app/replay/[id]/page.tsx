"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout";
import { ReplayScreen } from "@/components/game";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getMatchById } from "@/services/matchService";
import { datasetFromMatchRow, type ReplayDataset } from "@/lib/replay";

/**
 * Replay route — loads a saved match by ID and plays it back.
 * RLS restricts the query to the signed-in player's own matches.
 */
export default function ReplayPage() {
  const params = useParams<{ id: string }>();
  const matchId = params?.id;
  const [dataset, setDataset] = useState<ReplayDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setError("Sign in to watch saved replays.");
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = await getMatchById(supabase as any, matchId as string);
        if (!row) {
          if (!cancelled) setError("Replay not found — it may have been deleted.");
          return;
        }
        if (!cancelled) setDataset(datasetFromMatchRow(row));
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
  }, [matchId]);

  return (
    <AppShell>
      <div className="py-6 space-y-4">
        <Link href="/history" className="inline-block">
          <Button variant="ghost" size="sm">
            ← Match History
          </Button>
        </Link>

        {loading && (
          <p className="text-ocean-300 text-center py-12">Loading replay...</p>
        )}

        {!loading && error && (
          <Card className="p-12 text-center space-y-4">
            <p className="text-red-400">{error}</p>
            <Link href="/history" className="inline-block">
              <Button variant="secondary" size="md">
                Back to History
              </Button>
            </Link>
          </Card>
        )}

        {!loading && !error && dataset && <ReplayScreen dataset={dataset} autoPlay />}
      </div>
    </AppShell>
  );
}
