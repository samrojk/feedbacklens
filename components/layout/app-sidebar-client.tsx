"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  Layers3,
  ChevronDown,
  Check,
  Loader2,
  UserRound,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

type Workspace = {
  id: string;
  name: string;
  role: string;
};

type Props = {
  workspaceId: string;
  workspaceName: string;
  userName: string;
  userEmail: string;
  role: string;
};

const navigation = [
  { title: "Overview", url: "/overview", icon: LayoutDashboard },
  { title: "Import feedback", url: "/feedback", icon: MessageSquare },
  { title: "Issues", url: "/issues", icon: Layers3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebarClient({
  workspaceId,
  workspaceName,
  userName,
  userEmail,
  role,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState(workspaceId);
  const [switching, setSwitching] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [switchError, setSwitchError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaces() {
      try {
        const response = await fetch("/api/workspaces", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load workspaces.");
        }

        const data = await response.json();

        if (!cancelled) {
          setWorkspaces(data.workspaces ?? []);
          setActiveId(data.activeWorkspaceId ?? workspaceId);
        }
      } catch (error) {
        if (!cancelled) {
          setSwitchError(
            error instanceof Error
              ? error.message
              : "Unable to load workspaces.",
          );
        }
      } finally {
        if (!cancelled) setLoadingWorkspaces(false);
      }
    }

    loadWorkspaces();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  async function switchWorkspace(nextWorkspace: Workspace) {
    if (nextWorkspace.id === activeId || switching) return;

    setSwitching(true);
    setSwitchError("");

    try {
      const response = await fetch("/api/workspaces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: nextWorkspace.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to switch workspace.");
      }

      setActiveId(nextWorkspace.id);
      router.refresh();
    } catch (error) {
      setSwitchError(
        error instanceof Error ? error.message : "Unable to switch workspace.",
      );
    } finally {
      setSwitching(false);
    }
  }

  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === activeId,
  );

  const displayedWorkspaceName = activeWorkspace?.name ?? workspaceName;

  const displayedRole = activeWorkspace?.role ?? role;

  return (
    <Sidebar collapsible="none" className="border-r bg-background">
      <SidebarHeader className="gap-5 p-4">
        <Link href="/overview" className="flex items-center gap-3 px-2 py-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background">
            <Layers3 className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            FeedbackLens
          </span>
        </Link>

        <WorkspaceSwitcher variant="sidebar" />

        {switchError && (
          <p role="alert" className="text-xs text-destructive">
            {switchError}
          </p>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-wider">
            Workspace
          </SidebarGroupLabel>

          <SidebarMenu className="gap-1">
            {navigation.map((item) => {
              const active =
                pathname === item.url ||
                (item.url !== "/overview" &&
                  pathname.startsWith(`${item.url}/`));

              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={active}
                    className="h-10 rounded-lg px-3 data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=true]:hover:bg-foreground data-[active=true]:hover:text-background"
                  >
                    <item.icon className="size-4.5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <div className="rounded-xl border border-orange-200/70 bg-orange-50/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-700">
              <Sparkles className="size-4" />
              AI insights
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Turn customer feedback into clearer product decisions.
            </p>

            <Link
              href="/issues"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-orange-700 hover:underline"
            >
              Explore insights <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/profile" />}
              isActive={pathname === "/profile"}
              className="h-12"
            >
              <Avatar className="size-9">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {userEmail}
                </p>
              </div>

              <UserRound className="size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
