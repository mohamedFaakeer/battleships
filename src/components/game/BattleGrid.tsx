import { cn } from "@/lib/utils";
import type { GridTile, TileType, Coordinate } from "@/types";

// ---- Tile colour map ----------------------------------------

const TILE_BASE: Record<TileType, string> = {
  water:    "bg-ocean-800 hover:bg-ocean-600",
  fog:      "bg-ocean-800 hover:bg-ocean-600",
  ship:     "bg-ocean-500",
  hit:      "bg-red-500",
  miss:     "bg-ocean-700 opacity-60",
  sunk:     "bg-red-800",
  obstacle: "bg-ocean-950 cursor-not-allowed",
};

const TILE_CURSOR: Partial<Record<TileType, string>> = {
  water:    "cursor-pointer",
  fog:      "cursor-pointer",
  ship:     "cursor-default",
  hit:      "cursor-not-allowed",
  miss:     "cursor-not-allowed",
  sunk:     "cursor-not-allowed",
  obstacle: "cursor-not-allowed",
};

// ---- Tile icons ---------------------------------------------

function TileIcon({ type }: { type: TileType }) {
  if (type === "hit")  return <span aria-hidden="true" className="text-white text-xs leading-none">✕</span>;
  if (type === "miss") return <span aria-hidden="true" className="text-ocean-400 text-xs leading-none">·</span>;
  if (type === "sunk") return <span aria-hidden="true" className="text-red-300 text-xs leading-none">✕</span>;
  if (type === "obstacle") return <span aria-hidden="true" className="text-ocean-700 text-xs leading-none">▪</span>;
  return null;
}

// ---- Column header labels (A, B, C …) sized to the actual grid ----

function columnLabels(cols: number): string[] {
  return Array.from({ length: cols }, (_, i) => String.fromCharCode(65 + i));
}

// ---- Props --------------------------------------------------

interface BattleGridProps {
  /** 2D grid to render */
  grid: GridTile[][];
  /** Called when an attackable tile is clicked */
  onCellClick?: (coord: Coordinate) => void;
  /** Called when hovering over a tile (for placement preview) */
  onCellHover?: (coord: Coordinate | null) => void;
  /** Highlight this coordinate (e.g. preview during placement) */
  previewCoords?: Array<{ row: number; col: number }>;
  /** Whether clicks are disabled (opponent's turn, game over) */
  disabled?: boolean;
  /** Accessible label for the grid */
  label: string;
  /** Show row/col axis labels */
  showLabels?: boolean;
  className?: string;
}

export function BattleGrid({
  grid,
  onCellClick,
  onCellHover,
  previewCoords = [],
  disabled = false,
  label,
  showLabels = true,
  className,
}: BattleGridProps) {
  const cols = grid[0]?.length ?? 0;
  const labels = columnLabels(cols);

  function isPreview(r: number, c: number) {
    return previewCoords.some((p) => p.row === r && p.col === c);
  }

  function isClickable(tile: GridTile) {
    if (disabled || !onCellClick) return false;
    // During placement, allow clicking on water/obstacle tiles
    // During battle, only allow clicking fog
    return tile.type === "water" || tile.type === "fog";
  }

  return (
    <div 
      className={cn("select-none", className)} 
      role="grid" 
      aria-label={label}
      onMouseLeave={() => onCellHover?.(null)}
    >
      {showLabels && (
        <div
          className="grid mb-0.5"
          style={{ gridTemplateColumns: `1.25rem repeat(${cols}, 1fr)` }}
          aria-hidden="true"
        >
          <div />
          {labels.map((l) => (
            <div key={l} className="text-center text-ocean-500 text-[10px] font-medium leading-4">
              {l}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-px">
        {grid.map((row, r) => (
          <div
            key={r}
            className="flex gap-px"
            role="row"
          >
            {showLabels && (
              <div
                className="w-5 shrink-0 flex items-center justify-center text-ocean-500 text-[10px] font-medium"
                aria-hidden="true"
              >
                {r + 1}
              </div>
            )}
            {row.map((tile) => {
              const clickable = isClickable(tile);
              const preview   = isPreview(tile.coordinate.row, tile.coordinate.col);

              return (
                <button
                  key={tile.coordinate.col}
                  role="gridcell"
                  aria-label={`${labels[tile.coordinate.col]}${tile.coordinate.row + 1} — ${tile.type}`}
                  aria-disabled={!clickable}
                  disabled={!clickable}
                  onClick={() => clickable && onCellClick?.(tile.coordinate)}
                  onMouseEnter={() => onCellHover?.(tile.coordinate)}
                  className={cn(
                    // base sizing — fills parent grid column
                    "aspect-square w-full min-w-0 rounded-[2px]",
                    "flex items-center justify-center",
                    "transition-colors duration-100 outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ocean-300 focus-visible:ring-offset-1",
                    TILE_BASE[tile.type],
                    TILE_CURSOR[tile.type],
                    // placement preview highlight
                    preview && "!bg-ocean-400 ring-1 ring-ocean-200",
                  )}
                >
                  <TileIcon type={tile.type} />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
