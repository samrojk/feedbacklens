"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  Layers3,
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

const navigation = [
  {
    title: "Overview",
    url: "/overview",
    icon: LayoutDashboard,
  },
  {
    title: "Import feedback",
    url: "/feedback",
    icon: MessageSquare,
  },
  {
    title: "Issues",
    url: "/issues",
    icon: Layers3,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

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

        <button className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50">
          <div className="flex size-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <Layers3 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">My Workspace</p>
            <p className="text-xs text-muted-foreground">Workspace</p>
          </div>
          <span className="text-muted-foreground">⌄</span>
        </button>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-wider">
            Workspace
          </SidebarGroupLabel>

          <SidebarMenu className="gap-1">
            {navigation.map((item) => {
              const active = pathname === item.url;

              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={active}
                    className="h-10 rounded-lg px-3 data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=true]:hover:bg-foreground data-[active=true]:hover:text-background"
                  >
                    <item.icon className="size-[18px]" />
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

      <SidebarFooter className="gap-3 border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={pathname === "/settings"}
            >
              <Settings className="size-[18px]" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-foreground text-sm text-background">
            U
          </div>
          <div>
            <p className="text-sm font-medium">Your account</p>
            <p className="text-xs text-muted-foreground">Workspace member</p>
          </div>
          <Activity className="ml-auto size-4 text-muted-foreground" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}