"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Layers3 } from "lucide-react";

const pageNames: Record<string, string> = {
  "/overview": "Overview",
  "/feedback": "Import feedback",
  "/issues": "Issues",
};

export function AppHeader() {
  const pathname = usePathname();
  const currentPage = pageNames[pathname] ?? "FeedbackLens";

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200/80 bg-white/90 backdrop-blur-xl">
      <div className="flex h-17 items-center justify-between px-5 md:px-8">
        {/* Mobile brand */}
        <div className="flex items-center gap-2 md:hidden">
          <Layers3 size={20} />
          <span className="font-semibold tracking-tight">FeedbackLens</span>
        </div>

        {/* Breadcrumb */}
        <div className="hidden items-center gap-2 text-sm md:flex">
          <span className="text-neutral-400">Workspace</span>
          <ChevronRight size={14} className="text-neutral-300" />
          <span className="font-medium text-neutral-900">{currentPage}</span>
        </div>

        {/* Mobile page name */}
        <span className="text-sm font-medium md:hidden">{currentPage}</span>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 sm:inline-flex">
            Feedback intelligence
          </span>

          <button
            type="button"
            aria-label="Notifications"
            className="flex size-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100"
          >
            <Bell size={18} />
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      <nav className="flex gap-2 overflow-x-auto border-t border-neutral-100 px-4 py-2 md:hidden">
        {Object.entries(pageNames).map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium ${
              pathname === href
                ? "bg-neutral-950 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
