import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "info";
  className?: string;
}

const variantClasses = {
  default: "bg-ocean-800 text-ocean-200",
  success: "bg-emerald-900 text-emerald-300",
  danger:  "bg-red-900 text-red-300",
  warning: "bg-amber-900 text-amber-300",
  info:    "bg-ocean-700 text-ocean-200",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
