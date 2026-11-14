import "server-only";

import { cache } from "react";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";
import { supabase } from "@/lib/supabase/server";

export const getUserWorkspace = cache(async function getUserWorkspace() {
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
    .select("default_workspace_id, full_name")
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

  // Membership and workspace details are independent once the profile is known.
  const [membershipResult, workspaceResult] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("workspace_id", profile.default_workspace_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("workspaces")
      .select("id, name")
      .eq("id", profile.default_workspace_id)
      .maybeSingle(),
  ]);

  if (membershipResult.error) {
    console.error("Membership lookup failed:", membershipResult.error);

    return {
      success: false as const,
      status: 500,
      error: "Unable to verify workspace membership",
    };
  }

  const membership = membershipResult.data;

  if (!membership) {
    return {
      success: false as const,
      status: 403,
      error: "You do not have access to your default workspace",
    };
  }

  if (workspaceResult.error || !workspaceResult.data) {
    console.error("Workspace lookup failed:", workspaceResult.error);

    return {
      success: false as const,
      status: 500,
      error: "Unable to retrieve workspace",
    };
  }

  const workspace = workspaceResult.data;

  return {
    success: true as const,
    user,
    profileFullName: profile.full_name,
    workspaceId: workspace.id,
    workspace,
    role: membership.role,
  };
});
