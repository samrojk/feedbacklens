import "server-only";

import { getAuthenticatedUser } from "@/lib/supabase/get-user";
import { supabase } from "@/lib/supabase/server";

export async function requireWorkspaceAccess(workspaceId: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      authorized: false as const,
      status: 401,
      error: "Unauthorized",
    };
  }

  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("id, workspace_id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Workspace access check failed:", error);

    return {
      authorized: false as const,
      status: 500,
      error: "Unable to verify workspace access",
    };
  }

  if (!membership) {
    return {
      authorized: false as const,
      status: 403,
      error: "You do not have access to this workspace",
    };
  }

  return {
    authorized: true as const,
    user,
    membership,
  };
}
