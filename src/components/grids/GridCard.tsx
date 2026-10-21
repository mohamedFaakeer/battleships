"use client";

import Link from "next/link";
import type { CustomGridRow } from "@/types";
import { Badge, Button, Card } from "@/components/ui";
import { GridPreview } from "./GridPreview";
import { describeGridData, gridConfigFromRow, fleetTileCount } from "@/lib/grids";

interface GridCardProps {
  row: CustomGridRow;
  /** True when the signed-in player owns this grid (enables edit/delete). */
  owned: boolean;
  onDelete?: (row: CustomGridRow) => void;
  deletePending?: boolean;
}

/** Browse card for a grid: preview, meta, and play / edit / delete actions. */
export function GridCard({ row, owned, onDelete, deletePending = false }: GridCardProps) {
  const config = gridConfigFromRow(row);
  const playable =
    config.fleetConfig.ships.reduce((sum, ship) => sum + ship.count, 0) > 0 &&
    row.grid_data.rows >= 5;

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex gap-4">
        <div className="w-24 shrink-0">
          <GridPreview data={row.grid_data} />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-ocean-50 font-semibold truncate" title={row.name}>
              {row.name}
            </h3>
            <div className="flex shrink-0 gap-1">
              <Badge variant={row.is_public ? "info" : "default"}>
                {row.is_public ? "Public" : "Private"}
              </Badge>
              {owned && <Badge variant="warning">Yours</Badge>}
            </div>
          </div>

          {row.description && (
            <p className="text-ocean-400 text-xs line-clamp-2">{row.description}</p>
          )}

          <p className="text-ocean-500 text-xs">{describeGridData(row.grid_data)}</p>
          <p className="text-ocean-600 text-xs">
            {row.play_count} {row.play_count === 1 ? "play" : "plays"} ·{" "}
            {fleetTileCount(row.grid_data.fleet)} ship tiles
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1 border-t border-ocean-800/70">
        <Link href={`/game?grid=${row.id}`} className="flex-1 min-w-[7rem]">
          <Button variant="primary" size="sm" className="w-full" disabled={!playable}>
            ▶ Play
          </Button>
        </Link>

        {owned && (
          <>
            <Link href={`/grids/edit/${row.id}`} className="flex-1 min-w-[7rem]">
              <Button variant="secondary" size="sm" className="w-full">
                Edit
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete?.(row)}
              className="min-w-[7rem]"
            >
              {deletePending ? "Confirm delete" : "Delete"}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
