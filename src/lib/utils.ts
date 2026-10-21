import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Coordinate } from "@/types";

/**
 * Merges Tailwind classes safely, resolving conflicts.
 * Use this everywhere instead of raw template literals.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generates a crypto-random UUID.
 * Works in both browser and Node (Next.js edge/server).
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Converts a zero-based row/col coordinate to a human-readable label.
 * e.g. { row: 0, col: 0 } → "A1"
 */
export function coordinateToLabel(coord: Coordinate): string {
  const col = String.fromCharCode(65 + coord.col); // A-Z
  const row = coord.row + 1;
  return `${col}${row}`;
}

/**
 * Parses a label back to a zero-based coordinate.
 * e.g. "A1" → { row: 0, col: 0 }
 */
export function labelToCoordinate(label: string): Coordinate | null {
  const match = label.toUpperCase().match(/^([A-Z])(\d+)$/);
  if (!match) return null;
  return {
    col: match[1].charCodeAt(0) - 65,
    row: parseInt(match[2], 10) - 1,
  };
}

/**
 * Checks whether two coordinates point to the same tile.
 */
export function coordEquals(a: Coordinate, b: Coordinate): boolean {
  return a.row === b.row && a.col === b.col;
}

/**
 * Checks whether a coordinate exists within a flat array of coordinates.
 */
export function coordInArray(
  coord: Coordinate,
  arr: Coordinate[]
): boolean {
  return arr.some((c) => coordEquals(c, coord));
}

/**
 * Clamps a number between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Returns a shallow-shuffled copy of an array (Fisher-Yates).
 */
export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Formats a duration in seconds to a mm:ss string.
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
