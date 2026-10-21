import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function Card({ children, className, as: Tag = "div" }: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-ocean-800 bg-ocean-900/60 backdrop-blur-sm p-4",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 pb-3 border-b border-ocean-800", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-ocean-50 font-semibold text-lg leading-snug", className)}>
      {children}
    </h2>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-ocean-200 text-sm", className)}>{children}</div>;
}
