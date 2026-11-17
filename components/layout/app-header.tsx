"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Sparkles } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

type Props = {
  workspaceName: string;
  modelName: string;
};

const pageTitles: Record<string, string> = {
  "/overview": "Overview",
  "/feedback": "Import feedback",
  "/issues": "Issues",
  "/settings": "Workspace settings",
  "/profile": "Profile",
};

export function AppHeader({ workspaceName, modelName }: Props) {
  const pathname = usePathname();

  const pageTitle =
    pageTitles[pathname] ??
    (pathname.startsWith("/analyses/") ? "Analysis details" : "Workspace");

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="md:hidden" />

        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-2 text-sm"
        >
          <span className="max-w-40 truncate text-muted-foreground sm:max-w-none">
            {workspaceName}
          </span>

          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />

          <span className="truncate font-medium">{pageTitle}</span>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium sm:flex bg-linear-to-r from-indigo-200 via-purple-200 to-pink-200">
          <Sparkles className="size-3.5 text-primary" />
          {modelName}
        </div>

        <Link
          href="/notifications"
          aria-label="Notifications"
          className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
        >
          <Bell className="size-4" />
        </Link>
      </div>
    </header>
  );
}
