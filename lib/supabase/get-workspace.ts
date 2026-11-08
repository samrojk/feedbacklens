import "server-only";

import { getAuthenticatedUser } from "@/lib/supabase/get-user";
import { supabase } from "@/lib/supabase/server";

export async function getUserWorkspace() {
  // 1. Authenticate user
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      success: false as const,
      status: 401,
      error: "Unauthorized",
    };
  }

  // 2. Retrieve user's default workspace
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("default_workspace_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile lookup failed:", profileError);

    return {
      success: false as const,
      status: 500,
      error: "Unable to retrieve user profile",
    };
  }

  if (!profile?.default_workspace_id) {
    return {
      success: false as const,
      status: 403,
      error: "No default workspace configured",
    };
  }

  // 3. Verify workspace membership
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", profile.default_workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error("Membership lookup failed:", membershipError);

    return {
      success: false as const,
      status: 500,
      error: "Unable to verify workspace membership",
    };
  }

  if (!membership) {
    return {
      success: false as const,
      status: 403,
      error: "You do not have access to your default workspace",
    };
  }

  // 4. Retrieve workspace details
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", membership.workspace_id)
    .single();

  if (workspaceError || !workspace) {
    console.error("Workspace lookup failed:", workspaceError);

    return {
      success: false as const,
      status: 500,
      error: "Unable to retrieve workspace",
    };
  }

  return {
    success: true as const,
    user,
    workspaceId: workspace.id,
    workspace,
    role: membership.role,
  };
}
