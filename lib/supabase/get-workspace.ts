import "server-only";

import { getAuthenticatedUser } from "@/lib/supabase/get-user";
import { supabase } from "@/lib/supabase/server";

export async function getUserWorkspace() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      success: false as const,
      status: 401,
      error: "Unauthorized",
    };
  }

  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select(
      `
      workspace_id,
      role,
      workspaces (
        id,
        name
      )
    `,
    )
    .eq("user_id", user.id)
    .order("workspace_id");

  if (error) {
    console.error("Workspace lookup failed:", error);

    return {
      success: false as const,
      status: 500,
      error: "Unable to retrieve workspace",
    };
  }

  if (!memberships || memberships.length === 0) {
    return {
      success: false as const,
      status: 403,
      error: "No workspace membership found",
    };
  }

  // Temporary: use the first workspace.
  // Workspace switching will be implemented later.
  const membership = memberships[0];

  return {
    success: true as const,
    user,
    workspaceId: membership.workspace_id,
    role: membership.role,
    workspace: membership.workspaces,
  };
}
