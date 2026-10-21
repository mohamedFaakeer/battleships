"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { GridEditor } from "@/components/grids";
import { createClient } from "@/lib/supabase/client";
import { getGridById } from "@/services/gridService";
import type { CustomGridRow } from "@/types";

/** Edit an existing custom grid — ownership enforced here and by RLS. */
export default function EditGridPage() {
  const params = useParams<{ id: string }>();
  const gridId = params?.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [row, setRow] = useState<CustomGridRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gridId) return;
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setError("Sign in to edit grids.");
          return;
        }
        if (!cancelled) setUserId(user.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const grid = await getGridById(supabase as any, gridId as string);

        if (!grid) {
          if (!cancelled) setError("That grid doesn't exist — it may have been deleted.");
          return;
        }
        if (grid.author_id !== user.id) {
          if (!cancelled) setError("You can only edit grids you created.");
          return;
        }
        if (!cancelled) setRow(grid);
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
  }, [gridId]);

  return (
    <AppShell>
      <div className="py-6 space-y-5 max-w-2xl mx-auto w-full">
        <div>
          <Link href="/grids" className="text-ocean-400 text-sm hover:text-ocean-200">
            ← All grids
          </Link>
          <h1 className="text-3xl font-bold text-ocean-50 mt-2">Edit Grid</h1>
        </div>

        {loading && <p className="text-ocean-300 py-8">Loading grid…</p>}

        {!loading && error && (
          <Card className="p-8 text-center space-y-4">
            <p className="text-red-400">{error}</p>
            <Link href="/grids" className="inline-block">
              <Button variant="secondary" size="md">
                Back to Grids
              </Button>
            </Link>
          </Card>
        )}

        {!loading && !error && row && userId && (
          <GridEditor
            userId={userId}
            mode="edit"
            gridId={row.id}
            initial={{
              name: row.name,
              description: row.description ?? "",
              isPublic: row.is_public,
              gridData: row.grid_data,
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
