import "server-only";

import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";
import { supabase } from "@/lib/supabase/server";
import { profileCacheTag, workspaceCacheTag } from "@/lib/supabase/cache-tags";

async function getCachedProfileName(userId: string) {
  "use cache";

  cacheLife({ stale: 300, revalidate: 3600, expire: 7200 });
  cacheTag(profileCacheTag(userId));

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Cached profile lookup failed:", error);
    throw new Error("Unable to retrieve user profile");
  }

  return data?.full_name ?? null;
}

async function getCachedWorkspace(workspaceId: string) {
  "use cache";

  cacheLife({ stale: 300, revalidate: 3600, expire: 7200 });
  cacheTag(workspaceCacheTag(workspaceId));

  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, deletion_scheduled_for")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    console.error("Cached workspace lookup failed:", error);
    throw new Error("Unable to retrieve workspace");
  }

  return data;
}

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

  // 2. Retrieve the current workspace selection.
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

  const workspaceId = profile?.default_workspace_id;

  if (!workspaceId) {
    return {
      success: false as const,
      status: 403,
      error: "No default workspace configured",
    };
  }

  // Membership is always checked on the current request.
  const membershipResult = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

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

  let profileFullName: string | null;
  let workspace: Awaited<ReturnType<typeof getCachedWorkspace>>;

  try {
    [profileFullName, workspace] = await Promise.all([
      getCachedProfileName(user.id),
      getCachedWorkspace(workspaceId),
    ]);
  } catch (error) {
    console.error("Workspace details lookup failed:", error);

    return {
      success: false as const,
      status: 500,
      error: "Unable to retrieve workspace details",
    };
  }

  return {
    success: true as const,
    user,
    profileFullName,
    workspaceId: workspace.id,
    workspace,
    role: membership.role,
  };
});
