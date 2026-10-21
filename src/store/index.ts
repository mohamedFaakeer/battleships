// Barrel — import store from "@/store"
export { useGameStore } from "./gameStore";
export {
  DEFAULT_GRID_CONFIG,
  buildEmptyGrid,
  buildFogGrid,
  applyObstacles,
  stampFleetOnGrid,
} from "./gameHelpers";
export { getOccupiedCoords, isValidPlacement, generateRandomFleet } from "./placement";
export { resolveAttack, pickAiTarget } from "./combat";
export { persistMatch } from "./persist";

