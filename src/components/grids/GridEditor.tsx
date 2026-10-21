"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { GridDataJson, ShipClass } from "@/types";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { createGrid, updateGrid } from "@/services/gridService";
import { cn, coordinateToLabel } from "@/lib/utils";
import {
  GRID_SIZE_OPTIONS,
  MAX_OBSTACLE_RATIO,
  SHIP_CLASSES,
  defaultFleetData,
  fleetTileCount,
  makeGridData,
  shipSpec,
  validateGridData,
} from "@/lib/grids";

type PaintMode = "add" | "remove";

interface GridEditorProps {
  userId: string;
  mode: "create" | "edit";
  /** Required in edit mode. */
  gridId?: string;
  initial?: {
    name: string;
    description: string;
    isPublic: boolean;
    gridData: GridDataJson;
  };
}

function friendlySaveError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("row-level security") || text.includes("permission")) {
    return "You need to be signed in to save a grid.";
  }
  if (text.includes("check grid_name_len") || text.includes("grid_name_len")) {
    return "Name must be 1–80 characters.";
  }
  if (text.includes("check grid_desc_len") || text.includes("grid_desc_len")) {
    return "Description must be 400 characters or fewer.";
  }
  return message;
}

function normaliseFleet(fleet: GridDataJson["fleet"] | undefined): GridDataJson["fleet"] {
  const defaults = defaultFleetData();
  if (!Array.isArray(fleet) || fleet.length === 0) return defaults;
  return defaults.map((spec) => {
    const stored = fleet.find((s) => s.class === spec.class);
    return stored ? { ...spec, count: stored.count } : spec;
  });
}

/**
 * Grid editor: name/visibility, grid size, an obstacle painter
 * (drag to paint, click with keyboard to toggle) and per-class fleet counts.
 * Saves through the grid service; validation gates the submit.
 */
export function GridEditor({ userId, mode, gridId, initial }: GridEditorProps) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? true);
  const [data, setData] = useState<GridDataJson>(
    initial?.gridData
      ? { ...initial.gridData, obstacles: initial.gridData.obstacles ?? [], fleet: normaliseFleet(initial.gridData.fleet) }
      : makeGridData(10)
  );

  const [painting, setPainting] = useState<PaintMode | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Debounced validation keeps dragging responsive.
  useEffect(() => {
    const timer = window.setTimeout(() => setProblem(validateGridData(data)), 250);
    return () => window.clearTimeout(timer);
  }, [data]);

  // Stop painting when the pointer is released anywhere, even off the grid.
  useEffect(() => {
    if (!painting) return;
    const stop = () => setPainting(null);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [painting]);

  function applyObstacle(row: number, col: number, mode: PaintMode) {
    setData((prev) => {
      const has = prev.obstacles.some((o) => o.row === row && o.col === col);
      const obstacles =
        mode === "add"
          ? has
            ? prev.obstacles
            : [...prev.obstacles, { row, col }]
          : has
          ? prev.obstacles.filter((o) => o.row !== row || o.col !== col)
          : prev.obstacles;
      return { ...prev, obstacles };
    });
  }

  function handleCellPointerDown(event: ReactPointerEvent<HTMLButtonElement>, row: number, col: number) {
    if (event.button !== 0) return;
    const occupied = data.obstacles.some((o) => o.row === row && o.col === col);
    const mode: PaintMode = occupied ? "remove" : "add";
    setPainting(mode);
    applyObstacle(row, col, mode);
  }

  function handleCellClick(event: ReactMouseEvent<HTMLButtonElement>, row: number, col: number) {
    // Keyboard activation only — pointer presses already painted on pointerdown.
    if (event.detail !== 0) return;
    const occupied = data.obstacles.some((o) => o.row === row && o.col === col);
    applyObstacle(row, col, occupied ? "remove" : "add");
  }

  function changeSize(size: number) {
    if (size === data.rows && size === data.cols) return;
    setData((prev) => makeGridData(size, { fleet: prev.fleet }));
  }

  function changeFleet(shipClass: ShipClass, delta: number) {
    setData((prev) => ({
      ...prev,
      fleet: prev.fleet.map((ship) =>
        ship.class === shipClass
          ? { ...ship, count: Math.min(2, Math.max(0, ship.count + delta)) }
          : ship
      ),
    }));
  }

  function randomiseObstacles() {
    const cells = data.rows * data.cols;
    const target = Math.min(
      Math.floor(cells * MAX_OBSTACLE_RATIO),
      Math.max(4, Math.floor(cells * 0.12))
    );
    const chosen = new Set<string>();
    while (chosen.size < target) {
      chosen.add(`${Math.floor(Math.random() * data.rows)}:${Math.floor(Math.random() * data.cols)}`);
    }
    setData((prev) => ({
      ...prev,
      obstacles: [...chosen].map((key) => {
        const [row, col] = key.split(":").map(Number);
        return { row, col };
      }),
    }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Give the grid a name.");
      return;
    }
    if (trimmedName.length > 80) {
      setError("Name must be 80 characters or fewer.");
      return;
    }
    if (trimmedDescription.length > 400) {
      setError("Description must be 400 characters or fewer.");
      return;
    }

    // Authoritative check at submit time (displayed problem is debounced).
    const invalid = validateGridData(data);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      if (mode === "create") {
        await createGrid(client, {
          author_id: userId,
          name: trimmedName,
          description: trimmedDescription || null,
          grid_data: data,
          is_public: isPublic,
        });
      } else {
        if (!gridId) throw new Error("Missing grid id.");
        await updateGrid(client, gridId, {
          name: trimmedName,
          description: trimmedDescription || null,
          grid_data: data,
          is_public: isPublic,
        });
      }

      router.push(`/grids?saved=${encodeURIComponent(trimmedName)}`);
      router.refresh();
    } catch (err) {
      setError(friendlySaveError((err as Error).message || "Could not save the grid."));
    } finally {
      setSaving(false);
    }
  }

  const obstacleLimit = Math.floor(data.rows * data.cols * MAX_OBSTACLE_RATIO);
  const totalShips = data.fleet.reduce((sum, ship) => sum + ship.count, 0);
  const canSave = !saving && !problem && totalShips > 0;

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Basics */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="grid-name" className="block text-ocean-200 text-sm font-medium mb-1.5">
              Grid name
            </label>
            <input
              id="grid-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Reef Passage"
              className="w-full rounded-xl bg-ocean-950/70 border border-ocean-700 px-4 py-2.5
                         text-ocean-50 placeholder:text-ocean-600 focus:border-ocean-400 outline-none"
            />
          </div>

          <div>
            <span className="block text-ocean-200 text-sm font-medium mb-1.5">Visibility</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Grid visibility">
              <button
                type="button"
                role="radio"
                aria-checked={isPublic}
                onClick={() => setIsPublic(true)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                  isPublic
                    ? "border-ocean-400 bg-ocean-800 text-ocean-50"
                    : "border-ocean-700 bg-ocean-950/50 text-ocean-300 hover:border-ocean-600"
                )}
              >
                Public — everyone can play
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!isPublic}
                onClick={() => setIsPublic(false)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                  !isPublic
                    ? "border-ocean-400 bg-ocean-800 text-ocean-50"
                    : "border-ocean-700 bg-ocean-950/50 text-ocean-300 hover:border-ocean-600"
                )}
              >
                Private — only me
              </button>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="grid-description" className="block text-ocean-200 text-sm font-medium mb-1.5">
            Description <span className="text-ocean-500">(optional)</span>
          </label>
          <textarea
            id="grid-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={400}
            rows={2}
            placeholder="Tight channels, few places to hide."
            className="w-full rounded-xl bg-ocean-950/70 border border-ocean-700 px-4 py-2.5
                       text-ocean-50 placeholder:text-ocean-600 focus:border-ocean-400 outline-none resize-y"
          />
        </div>
      </Card>

      {/* Obstacles */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-ocean-50 font-semibold">Obstacles</h2>
            <p className="text-ocean-400 text-xs mt-0.5">
              Click or drag on the water to block tiles — ships can&apos;t sit there.
            </p>
          </div>

          <div className="flex gap-2" role="group" aria-label="Grid size">
            {GRID_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => changeSize(size)}
                aria-pressed={data.rows === size && data.cols === size}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                  data.rows === size && data.cols === size
                    ? "bg-ocean-500 text-white"
                    : "text-ocean-300 hover:text-ocean-50 hover:bg-ocean-800"
                )}
              >
                {size}×{size}
              </button>
            ))}
          </div>
        </div>

        <div
          className="max-w-md w-full mx-auto grid gap-px p-px rounded-md bg-ocean-950 touch-none"
          style={{ gridTemplateColumns: `repeat(${data.cols}, minmax(0, 1fr))` }}
          role="group"
          aria-label="Obstacle painter"
          onPointerLeave={() => setPainting(null)}
        >
          {Array.from({ length: data.rows * data.cols }, (_, index) => {
            const row = Math.floor(index / data.cols);
            const col = index % data.cols;
            const occupied = data.obstacles.some((o) => o.row === row && o.col === col);
            return (
              <button
                key={index}
                type="button"
                aria-label={`${coordinateToLabel({ row, col })} — ${occupied ? "obstacle" : "water"}`}
                aria-pressed={occupied}
                onPointerDown={(e) => handleCellPointerDown(e, row, col)}
                onPointerEnter={() => painting && applyObstacle(row, col, painting)}
                onClick={(e) => handleCellClick(e, row, col)}
                className={cn(
                  "aspect-square rounded-[2px] outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ocean-300 focus-visible:ring-offset-1",
                  occupied
                    ? "bg-ocean-950 ring-1 ring-ocean-700"
                    : "bg-ocean-700 hover:bg-ocean-600"
                )}
              />
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-ocean-400 text-sm">
            <span className="text-ocean-100 font-semibold">{data.obstacles.length}</span> /{" "}
            {obstacleLimit} obstacles
            {data.rows !== initial?.gridData?.rows && data.obstacles.length > 0 && (
              <span className="text-ocean-600"> · changing size resets them</span>
            )}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={randomiseObstacles}>
              🎲 Randomise
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setData((prev) => ({ ...prev, obstacles: [] }))}
              disabled={data.obstacles.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* Fleet */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-ocean-50 font-semibold">Fleet</h2>
            <p className="text-ocean-400 text-xs mt-0.5">
              {totalShips} {totalShips === 1 ? "ship" : "ships"} · {fleetTileCount(data.fleet)}{" "}
              tiles occupied by ships
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setData((prev) => ({ ...prev, fleet: defaultFleetData() }))}
          >
            Reset fleet
          </Button>
        </div>

        <ul className="grid sm:grid-cols-2 gap-2" role="list">
          {SHIP_CLASSES.map((shipClass) => {
            const spec = shipSpec(shipClass);
            const entry = data.fleet.find((s) => s.class === shipClass);
            const count = entry?.count ?? 0;
            return (
              <li
                key={shipClass}
                className="flex items-center justify-between gap-3 rounded-xl border border-ocean-800
                           bg-ocean-950/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-ocean-100 text-sm font-medium truncate">{spec.name}</p>
                  <p className="text-ocean-500 text-xs">{spec.size} tiles each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Remove one ${spec.name}`}
                    onClick={() => changeFleet(shipClass, -1)}
                    disabled={count === 0}
                    className="h-7 w-7 rounded-lg border border-ocean-700 text-ocean-200
                               hover:bg-ocean-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    −
                  </button>
                  <span
                    className="w-5 text-center text-ocean-50 font-semibold tabular-nums"
                    aria-label={`${spec.name} count`}
                  >
                    {count}
                  </span>
                  <button
                    type="button"
                    aria-label={`Add one ${spec.name}`}
                    onClick={() => changeFleet(shipClass, 1)}
                    disabled={count === 2}
                    className="h-7 w-7 rounded-lg border border-ocean-700 text-ocean-200
                               hover:bg-ocean-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Save */}
      <div className="space-y-2">
        {problem && (
          <p className="text-amber-400 text-sm" role="alert">
            {problem}
          </p>
        )}
        {error && (
          <p className="text-red-400 text-sm" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" variant="primary" size="md" isLoading={saving} className="sm:min-w-40" disabled={!canSave}>
            {mode === "create" ? "Save Grid" : "Save Changes"}
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={() => router.push("/grids")}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
