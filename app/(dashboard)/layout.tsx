import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";

function DashboardLoading() {
  return (
    <div className="flex h-full min-h-0 w-full animate-pulse">
      <div className="hidden w-65 shrink-0 border-r bg-background md:block" />
      <div className="flex-1 space-y-6 p-6 md:p-8">
        <div className="h-14 rounded-lg bg-muted" />
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    </div>
  );
}

async function DashboardContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Supabase auth validates session expiry using the current time.
  await connection();

  const result = await getUserWorkspace();

  if (!result.success) {
    if (result.status === 401) {
      redirect("/login");
    }

    return (
      <main className="flex min-h-full flex-1 items-center justify-center p-6">
        <div className="max-w-lg rounded-xl border bg-card p-6">
          <h1 className="font-semibold">Unable to load your workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <AppSidebar result={result} />

      <SidebarInset className="min-h-0 overflow-hidden">
        <AppHeader />

        <main className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
          <div className="mx-auto w-full max-w-[1600px] p-5 md:p-8">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh min-h-0">
        <Suspense fallback={<DashboardLoading />}>
          <DashboardContent>{children}</DashboardContent>
        </Suspense>
      </SidebarProvider>
    </TooltipProvider>
  );
}
