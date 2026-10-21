/**
 * Smoke check for the custom-grid helpers (Phase 4).
 * Run with: npx --yes tsx scripts/verify-grids.ts
 */
import type { CustomGridRow, GridDataJson } from "../src/types";
import {
  GRID_SIZE_OPTIONS,
  defaultFleetData,
  describeGridData,
  fleetTileCount,
  gridConfigFromData,
  gridConfigFromRow,
  isUuid,
  makeGridData,
  validateGridData,
} from "../src/lib/grids";
import { generateRandomFleet, isValidPlacement } from "../src/store/placement";

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function fleetOf(counts: Partial<Record<string, number>>): GridDataJson["fleet"] {
  return defaultFleetData().map((ship) => ({
    ...ship,
    count: counts[ship.class] ?? 0,
  }));
}

console.log("\nGrid conversion");
{
  const row: CustomGridRow = {
    id: "6f4d1b2e-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
    author_id: "author-1",
    name: "Reef Passage",
    description: "tight",
    grid_data: {
      rows: 8,
      cols: 8,
      obstacles: [{ row: 0, col: 0 }],
      fleet: fleetOf({ carrier: 1, destroyer: 1 }),
    },
    is_public: true,
    play_count: 3,
    created_at: "",
    updated_at: "",
  };

  const config = gridConfigFromRow(row);
  check("row id/name become the config id/name", config.id === row.id && config.name === "Reef Passage");
  check("size mapped", config.rows === 8 && config.cols === 8);
  check("obstacles mapped", config.obstacles.length === 1 && config.obstacles[0].row === 0);
  check(
    "fleet counts mapped",
    config.fleetConfig.ships.reduce((s, ship) => s + ship.count, 0) === 2
  );

  const withoutFleet = gridConfigFromData({ rows: 10, cols: 10, obstacles: [], fleet: [] }, "x", "y");
  check(
    "empty stored fleet falls back to the standard fleet",
    withoutFleet.fleetConfig.ships.reduce((s, ship) => s + ship.count, 0) === 5
  );
}

console.log("\nUUID detection");
{
  check("classic config id is not a UUID", !isUuid("classic-10x10"));
  check("real UUID accepted", isUuid("6f4d1b2e-1a2b-4c3d-8e4f-5a6b7c8d9e0f"));
  check("non-hex rejected", !isUuid("not-a-uuid"));
}

console.log("\nValidation");
{
  const clean = makeGridData(10);
  check("default grid is valid", validateGridData(clean) === null, String(validateGridData(clean)));

  const tooMany = makeGridData(10, {
    obstacles: Array.from({ length: 40 }, (_, i) => ({ row: Math.floor(i / 10), col: i % 10 })),
  });
  const tooManyResult = validateGridData(tooMany);
  check(
    "rejects too many obstacles",
    typeof tooManyResult === "string" && tooManyResult.includes("Too many obstacles"),
    String(tooManyResult)
  );

  const noShips = makeGridData(10, { fleet: fleetOf({}) });
  const noShipsResult = validateGridData(noShips);
  check(
    "rejects an empty fleet",
    typeof noShipsResult === "string" && noShipsResult.includes("at least one ship"),
    String(noShipsResult)
  );

  const offGrid = makeGridData(6, { obstacles: [{ row: 99, col: 0 }] });
  const offGridResult = validateGridData(offGrid);
  check(
    "rejects obstacles outside the grid",
    typeof offGridResult === "string" && offGridResult.includes("outside"),
    String(offGridResult)
  );

  const overflow = makeGridData(5, {
    obstacles: [],
    fleet: fleetOf({ carrier: 2, battleship: 2, cruiser: 2, submarine: 2 }), // 30 tiles > 25 cells
  });
  const overflowResult = validateGridData(overflow);
  check(
    "rejects a fleet that cannot fit",
    typeof overflowResult === "string" && overflowResult.includes("doesn't fit"),
    String(overflowResult)
  );

  // A carrier needs a whole row or column free; on 5×5, one obstacle in every
  // row and every column makes that impossible — validation must fail, not throw.
  const blocked: GridDataJson = {
    rows: 5,
    cols: 5,
    obstacles: [0, 1, 2, 3, 4].map((i) => ({ row: i, col: i })),
    fleet: [{ class: "carrier", name: "Carrier", size: 5, count: 1 }],
  };
  const blockedResult = validateGridData(blocked);
  check(
    "rejects an undeployable layout",
    typeof blockedResult === "string" && blockedResult.includes("No room"),
    String(blockedResult)
  );
}

console.log("\nPlacement respects obstacles");
{
  const data = makeGridData(10, {
    obstacles: [
      { row: 4, col: 4 },
      { row: 4, col: 5 },
      { row: 0, col: 9 },
    ],
  });
  const config = gridConfigFromData(data, "test", "Test");

  let placementFailed = false;
  try {
    for (let i = 0; i < 10; i++) {
      const fleet = generateRandomFleet(config);
      const touchedObstacle = fleet.some((ship) =>
        ship.occupiedCoordinates.some((c) =>
          data.obstacles.some((o) => o.row === c.row && o.col === c.col)
        )
      );
      if (touchedObstacle) {
        check("generated fleet avoids obstacles", false, "ship overlapped an obstacle");
        placementFailed = true;
        break;
      }
    }
  } catch (err) {
    placementFailed = true;
    check("generated fleet avoids obstacles", false, (err as Error).message);
  }
  if (!placementFailed) check("generated fleet avoids obstacles", true);

  check(
    "obstacle cells are never valid placement",
    !isValidPlacement([{ row: 4, col: 4 }], config, [])
  );
}

console.log("\nDescriptions & options");
{
  check("size options offered", GRID_SIZE_OPTIONS.includes(6) && GRID_SIZE_OPTIONS.includes(12));
  check("tile count totals correctly", fleetTileCount(defaultFleetData()) === 17);
  const text = describeGridData(makeGridData(8));
  check("description renders", text.includes("8×8") && text.includes("obstacles"), text);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
