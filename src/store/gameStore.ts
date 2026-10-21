import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  GameState,
  GameActions,
  GridConfig,
  AiDifficulty,
  Coordinate,
  Ship,
} from "@/types";
import { generateId } from "@/lib/utils";
import {
  DEFAULT_GRID_CONFIG,
  buildEmptyGrid,
  buildFogGrid,
  applyObstacles,
  stampFleetOnGrid,
} from "./gameHelpers";
import { getOccupiedCoords, isValidPlacement, generateRandomFleet } from "./placement";
import { resolveAttack, pickAiTarget } from "./combat";
import { persistMatch } from "./persist";

// ============================================================
// INITIAL STATE FACTORY
// ============================================================

function buildInitialState(): GameState {
  const config = DEFAULT_GRID_CONFIG;
  return {
    gameId: null,
    phase: "idle",
    turn: "player",
    turnNumber: 0,
    player: { id: "local-player", type: "human", displayName: "Captain" },
    opponent: {
      id: "ai-opponent",
      type: "ai",
      displayName: "Admiral AI",
      aiDifficulty: "medium",
    },
    gridConfig: config,
    playerGrid: applyObstacles(buildEmptyGrid(config.rows, config.cols), config),
    opponentGrid: buildFogGrid(config.rows, config.cols),
    playerFleet: [],
    opponentFleet: [],
    attackHistory: [],
    winner: null,
    endedAt: null,
    placementMode: {
      active: false,
      shipClass: null,
      size: 0,
      orientation: "horizontal",
    },
    isLoading: false,
    error: null,
  };
}

type GameStore = GameState & GameActions & { _aiTurn: () => void };

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
      ...buildInitialState(),

      initGame: (config: GridConfig, difficulty: AiDifficulty) => {
        set(
          (state) => ({
            ...buildInitialState(),
            gameId: generateId(),
            phase: "setup",
            gridConfig: config,
            playerGrid: applyObstacles(buildEmptyGrid(config.rows, config.cols), config),
            opponentGrid: buildFogGrid(config.rows, config.cols),
            opponent: { ...state.opponent, aiDifficulty: difficulty },
          }),
          false, "initGame"
        );
      },

      placeShip: (shipDraft: Omit<Ship, "hitCoordinates" | "isSunk">) => {
        const { phase, gridConfig, playerFleet } = get();
        if (phase !== "setup") return;
        const coords = getOccupiedCoords(shipDraft.origin, shipDraft.size, shipDraft.orientation);
        if (!isValidPlacement(coords, gridConfig, playerFleet, shipDraft.id)) {
          set({ error: "Invalid placement — check bounds and overlaps." }, false, "placeShip/invalid");
          return;
        }
        const ship: Ship = { ...shipDraft, occupiedCoordinates: coords, hitCoordinates: [], isSunk: false };
        const newFleet = [...playerFleet.filter((s) => s.id !== ship.id), ship];
        const base = applyObstacles(buildEmptyGrid(gridConfig.rows, gridConfig.cols), gridConfig);
        set({ playerFleet: newFleet, playerGrid: stampFleetOnGrid(base, newFleet), error: null }, false, "placeShip");
      },

      removeShip: (shipId: string) => {
        const { phase, gridConfig, playerFleet } = get();
        if (phase !== "setup") return;
        const newFleet = playerFleet.filter((s) => s.id !== shipId);
        const base = applyObstacles(buildEmptyGrid(gridConfig.rows, gridConfig.cols), gridConfig);
        set({ playerFleet: newFleet, playerGrid: stampFleetOnGrid(base, newFleet) }, false, "removeShip");
      },

      randomiseFleet: () => {
        const { phase, gridConfig } = get();
        if (phase !== "setup") return;
        try {
          const fleet = generateRandomFleet(gridConfig);
          const base = applyObstacles(buildEmptyGrid(gridConfig.rows, gridConfig.cols), gridConfig);
          set({ playerFleet: fleet, playerGrid: stampFleetOnGrid(base, fleet), error: null }, false, "randomiseFleet");
        } catch (err) {
          set({ error: (err as Error).message }, false, "randomiseFleet/error");
        }
      },

      confirmSetup: () => {
        const { phase, gridConfig, playerFleet } = get();
        if (phase !== "setup") return;
        const required = gridConfig.fleetConfig.ships.reduce((s, sp) => s + sp.count, 0);
        if (playerFleet.length < required) {
          set({ error: `Place all ${required} ships before starting.` }, false, "confirmSetup/incomplete");
          return;
        }
        const opponentFleet = generateRandomFleet(gridConfig);
        set(
          {
            phase: "battle",
            opponentFleet,
            turn: "player",
            turnNumber: 1,
            error: null,
          },
          false, "confirmSetup"
        );
      },

      attackCell: (coordinate: Coordinate) => {
        const state = get();
        if (state.phase !== "battle" || state.turn !== "player") return;
        const tile = state.opponentGrid[coordinate.row]?.[coordinate.col];
        if (!tile || ["hit", "miss", "sunk", "obstacle"].includes(tile.type)) return;

        const { result, sunkShipId, updatedFleet, updatedGrid } =
          resolveAttack(coordinate, state.opponentFleet, state.opponentGrid);

        const record = {
          turnNumber: state.turnNumber,
          attackerId: state.player.id,
          coordinate,
          result,
          sunkShipId,
          timestamp: new Date().toISOString(),
        };
        const newHistory = [...state.attackHistory, record];
        const playerWon = updatedFleet.every((s) => s.isSunk);

        if (playerWon) {
          set(
            {
              opponentFleet: updatedFleet, opponentGrid: updatedGrid,
              attackHistory: newHistory, phase: "game_over",
              winner: "player", endedAt: new Date().toISOString(),
            },
            false, "attackCell/playerWon"
          );
          // Persist match to database
          persistMatch(get()).catch((err) => console.error("Failed to save match:", err));
          return;
        }
        set(
          {
            opponentFleet: updatedFleet, opponentGrid: updatedGrid,
            attackHistory: newHistory, turn: "opponent",
            turnNumber: state.turnNumber + 1,
          },
          false, "attackCell"
        );
        setTimeout(() => get()._aiTurn(), 700);
      },

      _aiTurn: () => {
        const state = get();
        if (state.phase !== "battle" || state.turn !== "opponent") return;
        const target = pickAiTarget(
          state.playerGrid,
          state.gridConfig.rows,
          state.gridConfig.cols,
          state.opponent.aiDifficulty ?? "medium"
        );
        const { result, sunkShipId, updatedFleet, updatedGrid } =
          resolveAttack(target, state.playerFleet, state.playerGrid);

        const record = {
          turnNumber: state.turnNumber,
          attackerId: state.opponent.id,
          coordinate: target, result, sunkShipId,
          timestamp: new Date().toISOString(),
        };
        const newHistory = [...state.attackHistory, record];
        const aiWon = updatedFleet.every((s) => s.isSunk);

        set(
          {
            playerFleet: updatedFleet, playerGrid: updatedGrid, attackHistory: newHistory,
            ...(aiWon
              ? { phase: "game_over", winner: "opponent", endedAt: new Date().toISOString() }
              : { turn: "player", turnNumber: state.turnNumber + 1 }),
          },
          false, aiWon ? "aiTurn/aiWon" : "aiTurn/complete"
        );

        // Persist match to database if AI won
        if (aiWon) {
          persistMatch(get()).catch((err) => console.error("Failed to save match:", err));
        }
      },

      resetGame: () => set(buildInitialState(), false, "resetGame"),

      setError: (message: string | null) => set({ error: message }, false, "setError"),

      // ---- Placement mode actions ----

      startPlacement: (shipClass, size) => {
        const { phase } = get();
        if (phase !== "setup") return;
        set({
          placementMode: { active: true, shipClass, size, orientation: "horizontal" },
          error: null,
        }, false, "startPlacement");
      },

      cancelPlacement: () => {
        set({
          placementMode: { active: false, shipClass: null, size: 0, orientation: "horizontal" },
          error: null,
        }, false, "cancelPlacement");
      },

      toggleOrientation: () => {
        const { placementMode } = get();
        if (!placementMode.active) return;
        set({
          placementMode: {
            ...placementMode,
            orientation: placementMode.orientation === "horizontal" ? "vertical" : "horizontal",
          },
        }, false, "toggleOrientation");
      },

      placeShipAtCoord: (coord) => {
        const { phase, placementMode, gridConfig, playerFleet } = get();
        if (phase !== "setup" || !placementMode.active || !placementMode.shipClass) return;

        const id = generateId();
        const coords = getOccupiedCoords(coord, placementMode.size, placementMode.orientation);

        if (!isValidPlacement(coords, gridConfig, playerFleet)) {
          set({ error: "Invalid placement — check bounds and overlaps." }, false, "placeShipAtCoord/invalid");
          return;
        }

        const ship: Ship = {
          id,
          class: placementMode.shipClass,
          name: gridConfig.fleetConfig.ships.find((s) => s.class === placementMode.shipClass)?.name ?? "Ship",
          size: placementMode.size,
          orientation: placementMode.orientation,
          origin: coord,
          occupiedCoordinates: coords,
          hitCoordinates: [],
          isSunk: false,
        };

        const newFleet = [...playerFleet, ship];
        const base = applyObstacles(buildEmptyGrid(gridConfig.rows, gridConfig.cols), gridConfig);

        set({
          playerFleet: newFleet,
          playerGrid: stampFleetOnGrid(base, newFleet),
          placementMode: { active: false, shipClass: null, size: 0, orientation: "horizontal" },
          error: null,
        }, false, "placeShipAtCoord");
      },
    }),
    { name: "battleships-game-store" }
  )
);
