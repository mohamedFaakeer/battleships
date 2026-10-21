"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { GridEditor } from "@/components/grids";
import { createClient } from "@/lib/supabase/client";

/** Create a new custom grid. Middleware requires a session; re-checked here. */
export default function NewGridPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (!data.user) setError("Sign in to build a grid.");
      else setUserId(data.user.id);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <div className="py-6 space-y-5 max-w-2xl mx-auto w-full">
        <div>
          <Link href="/grids" className="text-ocean-400 text-sm hover:text-ocean-200">
            ← All grids
          </Link>
          <h1 className="text-3xl font-bold text-ocean-50 mt-2">New Grid</h1>
          <p className="text-ocean-400 text-sm mt-1">
            Choose a size, paint obstacles, set the fleet, then save it.
          </p>
        </div>

        {loading && <p className="text-ocean-300 py-8">Checking your session…</p>}

        {!loading && error && (
          <Card className="p-8 text-center space-y-4">
            <p className="text-red-400">{error}</p>
            <Link href="/auth/login?redirectedFrom=%2Fgrids%2Fnew" className="inline-block">
              <Button variant="primary" size="md">
                Sign In
              </Button>
            </Link>
          </Card>
        )}

        {!loading && !error && userId && <GridEditor userId={userId} mode="create" />}
      </div>
    </AppShell>
  );
}
