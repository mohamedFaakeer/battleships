import type { GridDataJson } from "@/types";
import { cn } from "@/lib/utils";

interface GridPreviewProps {
  data: GridDataJson;
  className?: string;
  /** Larger cells for the editor's save confirmation / detail view. */
  emphasis?: boolean;
}

/**
 * Compact read-only thumbnail of a grid — free cells in ocean blue,
 * obstacles as dark squares. Purely decorative: cells aren't interactive.
 */
export function GridPreview({ data, className, emphasis = false }: GridPreviewProps) {
  const rows = Math.max(1, data.rows);
  const cols = Math.max(1, data.cols);
  const obstacles = new Set(
    (data.obstacles ?? []).map((o) => `${o.row}:${o.col}`)
  );

  return (
    <div
      className={cn("select-none w-full", className)}
      aria-hidden="true"
      role="img"
      aria-label={`Grid preview, ${rows} by ${cols}`}
    >
      <div
        className="grid gap-px rounded-md overflow-hidden bg-ocean-950 p-px"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: rows * cols }, (_, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          const isObstacle = obstacles.has(`${row}:${col}`);
          return (
            <div
              key={index}
              className={cn(
                "aspect-square",
                isObstacle ? "bg-ocean-950" : "bg-ocean-700",
                emphasis && isObstacle && "bg-black"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
