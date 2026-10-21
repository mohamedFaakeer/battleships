import Link from "next/link";
import { AppShell } from "@/components/layout";

/**
 * Home / landing page.
 * Primary CTA leads into the game lobby at /game, where difficulty is chosen.
 */
export default function HomePage() {
  return (
    <AppShell>
      <section
        className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] px-4 text-center"
        aria-label="Game lobby"
      >
        {/* Hero */}
        <div className="mb-10 select-none">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-ocean-50 mb-3">
            ⚓ Battleships
          </h1>
          <p className="text-ocean-300 text-lg sm:text-xl max-w-md mx-auto">
            Command your fleet. Outmanoeuvre the Admiral. Sink or be sunk.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Link
            href="/game"
            className="flex-1 rounded-xl bg-ocean-500 text-white font-semibold py-3 px-6
                       text-base text-center transition-colors hover:bg-ocean-400
                       focus-visible:bg-ocean-400"
          >
            Play vs AI
          </Link>
          <button
            disabled
            aria-disabled="true"
            className="flex-1 rounded-xl border border-ocean-500 text-ocean-300 font-semibold
                       py-3 px-6 opacity-60 cursor-not-allowed text-base"
            title="Multiplayer arrives in a later phase"
          >
            Multiplayer
          </button>
        </div>

        <p className="mt-6 text-ocean-500 text-sm">
          3 difficulties · drag-free placement · instant replays
        </p>
      </section>
    </AppShell>
  );
}
