import { AppSidebarClient } from "@/components/layout/app-sidebar-client";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";

export async function AppSidebar() {
  const result = await getUserWorkspace();

  if (!result.success) {
    return <div className="w-[260px] border-r bg-background" />;
  }

  const metadata = result.user.user_metadata ?? {};

  const userName =
    metadata.full_name ||
    metadata.name ||
    result.user.email?.split("@")[0] ||
    "User";

  return (
    <AppSidebarClient
      workspaceName={result.workspace.name}
      userName={userName}
      userEmail={result.user.email ?? ""}
      role={result.role}
    />
  );
}