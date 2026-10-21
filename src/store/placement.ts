import type { GridConfig, Ship, Coordinate } from "@/types";
import { generateId, coordInArray } from "@/lib/utils";

export function getOccupiedCoords(
  origin: Coordinate,
  size: number,
  orientation: "horizontal" | "vertical"
): Coordinate[] {
  return Array.from({ length: size }, (_, i) => ({
    row: orientation === "vertical" ? origin.row + i : origin.row,
    col: orientation === "horizontal" ? origin.col + i : origin.col,
  }));
}

export function isValidPlacement(
  coords: Coordinate[],
  config: GridConfig,
  existingFleet: Ship[],
  excludeShipId?: string
): boolean {
  const taken = existingFleet
    .filter((s) => s.id !== excludeShipId)
    .flatMap((s) => s.occupiedCoordinates);

  for (const c of coords) {
    if (c.row < 0 || c.row >= config.rows || c.col < 0 || c.col >= config.cols)
      return false;
    if (coordInArray(c, config.obstacles)) return false;
    if (coordInArray(c, taken)) return false;
  }
  return true;
}

export function generateRandomFleet(config: GridConfig): Ship[] {
  const fleet: Ship[] = [];

  for (const spec of config.fleetConfig.ships) {
    for (let i = 0; i < spec.count; i++) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 500) {
        attempts++;
        const orientation =
          Math.random() < 0.5 ? "horizontal" : "vertical";
        const maxRow =
          orientation === "vertical"
            ? config.rows - spec.size
            : config.rows - 1;
        const maxCol =
          orientation === "horizontal"
            ? config.cols - spec.size
            : config.cols - 1;
        const origin: Coordinate = {
          row: Math.floor(Math.random() * (maxRow + 1)),
          col: Math.floor(Math.random() * (maxCol + 1)),
        };
        const coords = getOccupiedCoords(origin, spec.size, orientation);

        if (isValidPlacement(coords, config, fleet)) {
          fleet.push({
            id: generateId(),
            class: spec.class,
            name: spec.name,
            size: spec.size,
            orientation,
            origin,
            occupiedCoordinates: coords,
            hitCoordinates: [],
            isSunk: false,
          });
          placed = true;
        }
      }

      if (!placed)
        throw new Error(`Could not place ${spec.name} after 500 attempts`);
    }
  }

  return fleet;
}
