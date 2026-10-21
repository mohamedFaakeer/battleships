import { cn } from "@/lib/utils";
import { NavBar } from "./NavBar";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Root shell that wraps every page.
 * Provides the persistent NavBar + a scrollable main content area.
 * Mobile-first: full-height layout using dvh so the bar is never cut off.
 */
export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-dvh bg-ocean-950">
      <NavBar />
      <main
        id="main-content"
        className={cn(
          "flex-1 flex flex-col w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8",
          className
        )}
      >
        {children}
      </main>
      <footer className="py-3 text-center text-ocean-600 text-xs pb-safe">
        Battleships &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
