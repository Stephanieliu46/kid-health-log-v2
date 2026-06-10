import type { ReactNode } from "react";

/** iPhone-sized viewport shell — tab pages fit in one screen without scrolling. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-[100dvh] w-full flex justify-center bg-background overflow-hidden">
      <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}

export function TabPage({
  children,
  className = "",
  scrollable = false,
}: {
  children: ReactNode;
  className?: string;
  /** Allow vertical scroll (e.g. Quick Log on small phones). */
  scrollable?: boolean;
}) {
  if (scrollable) {
    return (
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
        <div className={`flex flex-col px-4 pt-2 pb-[4.75rem] ${className}`}>
          {children}
        </div>
      </main>
    );
  }

  return (
    <main
      className={`flex-1 flex flex-col min-h-0 overflow-hidden px-4 pt-2 pb-[5.25rem] ${className}`}
    >
      {children}
    </main>
  );
}
