import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-ocean-500 text-white hover:bg-ocean-400 focus-visible:bg-ocean-400 " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "border border-ocean-500 text-ocean-300 hover:text-ocean-50 hover:bg-ocean-800 " +
    "focus-visible:text-ocean-50 focus-visible:bg-ocean-800 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "text-ocean-300 hover:text-ocean-50 hover:bg-ocean-800 " +
    "focus-visible:text-ocean-50 focus-visible:bg-ocean-800 disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:bg-red-500 " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-base rounded-xl",
  lg: "px-7 py-3.5 text-lg rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold",
        "transition-colors duration-150 outline-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
