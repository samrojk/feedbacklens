import { AppSidebarClient } from "@/components/layout/app-sidebar-client";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";

type Props = {
  result: Extract<Awaited<ReturnType<typeof getUserWorkspace>>, { success: true }>;
};

export function AppSidebar({ result }: Props) {
  const userName =
    result.profileFullName ||
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