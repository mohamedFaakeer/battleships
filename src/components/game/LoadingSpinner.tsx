"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

/** Ocean-themed loading spinner with pulse animation */
export function LoadingSpinner({
  size = 48,
  className,
}: { size?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Start pulse animation when component mounts
    if (ref.current) {
      ref.current.style.animation = "spin 1s linear infinite";
    }
    return () => {
      if (ref.current) {
        ref.current.style.animation = "";
      }
    };
  }, []);

  const sizePx = `${size}px`;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2",
        className,
        "animate-pulse",
        ref?.current?.className || ""
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "w-12 h-12 rounded-full border-4 border-ocean-500 border-t-ocean-300",
          "animate-spin",
          `w-${sizePx}`,
          `h-${sizePx}`
        )}
      />
      <span className="text-ocean-400 text-sm">Loading...</span>
    </div>
  );
}

/** Ocean-themed skeleton grid placeholder */
export function LoadingGrid({
  rows = 10,
  cols = 10,
  className,
}: { rows?: number; cols?: number; className?: string }) {
  const size = 40;
  const cellSize = `${size}px`;

  return (
    <div
      className={cn(
        "grid grid-cols-" + cols,
        "gap-1",
        "w-fit",
        "max-w-[400px]",
        className,
        "animate-pulse"
      )}
    >
      {[...Array(rows)].map((_, r) => (
        <div
          key={r}
          className={cn(
            "h-" + cellSize,
            "bg-ocean-800/30",
            "rounded-[2px]",
            "animate-pulse"
          )}
        />
      ))}
    </div>
  );
}