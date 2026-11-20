"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Sparkles } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { NotificationBell } from "@/components/layout/notification-bell";

type Props = {
  workspaceName: string;
  modelName: string;
};

const pageTitles: Record<string, string> = {
  "/overview": "Overview",
  "/feedback": "Import feedback",
  "/issues": "Issues",
  "/settings": "Workspace settings",
  "/settings/members": "Workspace members",
  "/profile": "Profile",
  "/notifications": "Notifications",
};

export function AppHeader({ workspaceName, modelName }: Props) {
  const pathname = usePathname();

  const { activeWorkspace } = useWorkspace();

  // Use the shared workspace state for instant updates.
  const currentWorkspaceName = activeWorkspace?.name ?? workspaceName;

  const pageTitle =
    pageTitles[pathname] ??
    (pathname.startsWith("/analyses/") ? "Analysis details" : "Workspace");

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
      {/* Breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="md:hidden" />

        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-2 text-sm"
        >
          <span className="max-w-40 truncate text-muted-foreground sm:max-w-none">
            {currentWorkspaceName}
          </span>

          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />

          <span className="truncate font-medium">{pageTitle}</span>
        </nav>
      </div>

      {/* Header actions */}
      <div className="flex shrink-0 items-center gap-4">
        {/* Active AI model */}
        <div className="hidden items-center gap-2 rounded-full border bg-linear-to-r from-indigo-200 via-purple-200 to-pink-200 px-3 py-1.5 text-xs font-medium sm:flex">
          <Sparkles className="size-3.5 text-primary" />
          {modelName}
        </div>

        {/* Notifications */}
        <NotificationBell />
      </div>
    </header>
  );
}
