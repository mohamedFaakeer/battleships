"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { GridCard } from "@/components/grids";
import { createClient } from "@/lib/supabase/client";
import { deleteGrid, getMyGrids, getPublicGrids } from "@/services/gridService";
import type { CustomGridRow } from "@/types";

/**
 * Grid browser — community grids plus the signed-in player's own creations.
 * Play jumps into /game?grid=<id>; editing and deleting require ownership
 * (enforced here and again by RLS).
 */
export default function GridsPage() {
  const [publicGrids, setPublicGrids] = useState<CustomGridRow[]>([]);
  const [myGrids, setMyGrids] = useState<CustomGridRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const [community, mine] = await Promise.all([
        getPublicGrids(client),
        user ? getMyGrids(client, user.id) : Promise.resolve([]),
      ]);

      const mineIds = new Set(mine.map((grid) => grid.id));
      setUserId(user?.id ?? null);
      setMyGrids(mine);
      setPublicGrids(community.filter((grid) => !mineIds.has(grid.id)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const saved = new URLSearchParams(window.location.search).get("saved");
    if (saved) setNotice(saved);
  }, [load]);

  async function handleDelete(row: CustomGridRow) {
    if (deletePending !== row.id) {
      setDeletePending(row.id);
      return;
    }
    setDeletePending(null);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await deleteGrid(supabase as any, row.id);
      setMyGrids((prev) => prev.filter((grid) => grid.id !== row.id));
      setPublicGrids((prev) => prev.filter((grid) => grid.id !== row.id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const noGridsAtAll = !loading && !error && myGrids.length === 0 && publicGrids.length === 0;

  return (
    <AppShell>
      <div className="py-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ocean-50">Grids</h1>
            <p className="text-ocean-400 text-sm mt-1">
              Custom battlefields — obstacle fields, tight channels, unusual fleets
            </p>
          </div>
          <Link href="/grids/new">
            <Button variant="primary" size="md">
              + New Grid
            </Button>
          </Link>
        </div>

        {notice && (
          <div
            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-700/60
                       bg-emerald-950/30 px-4 py-3 text-emerald-300 text-sm"
            role="status"
          >
            <span>
              Saved <span className="font-semibold">“{notice}”</span>.
            </span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-emerald-500 hover:text-emerald-200"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {loading && (
          <div className="grid sm:grid-cols-2 gap-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 rounded-2xl border border-ocean-800 bg-ocean-900/40 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-6 text-center space-y-3">
            <p className="text-red-400">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => load()}>
              Try again
            </Button>
          </Card>
        )}

        {!loading && !error && (
          <div className="space-y-8">
            {/* My grids */}
            <section aria-label="Your grids" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-ocean-50 font-semibold text-lg">Your Grids</h2>
                {userId && myGrids.length > 0 && (
                  <span className="text-ocean-500 text-sm">{myGrids.length}</span>
                )}
              </div>

              {!userId ? (
                <Card className="p-6 text-center space-y-3">
                  <p className="text-ocean-300 text-sm">
                    Sign in to build grids and keep them across devices.
                  </p>
                  <Link href="/auth/login?redirectedFrom=%2Fgrids" className="inline-block">
                    <Button variant="primary" size="sm">
                      Sign In
                    </Button>
                  </Link>
                </Card>
              ) : myGrids.length === 0 ? (
                <Card className="p-6 text-center space-y-3">
                  <p className="text-ocean-300 text-sm">
                    You haven&apos;t built a grid yet — paint some obstacles and share it.
                  </p>
                  <Link href="/grids/new" className="inline-block">
                    <Button variant="secondary" size="sm">
                      Build your first grid
                    </Button>
                  </Link>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {myGrids.map((row) => (
                    <GridCard
                      key={row.id}
                      row={row}
                      owned
                      onDelete={handleDelete}
                      deletePending={deletePending === row.id}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Community grids */}
            <section aria-label="Community grids" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-ocean-50 font-semibold text-lg">Community Grids</h2>
                {publicGrids.length > 0 && (
                  <span className="text-ocean-500 text-sm">{publicGrids.length}</span>
                )}
              </div>

              {publicGrids.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-ocean-300 text-sm">
                    {noGridsAtAll
                      ? "No public grids yet — yours could be the first."
                      : "No community grids yet."}
                  </p>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {publicGrids.map((row) => (
                    <GridCard
                      key={row.id}
                      row={row}
                      owned={row.author_id === userId}
                      onDelete={handleDelete}
                      deletePending={deletePending === row.id}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
