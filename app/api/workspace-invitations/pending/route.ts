import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";
import { supabase } from "@/lib/supabase/server";

function privateNoStoreJson(body: unknown, status?: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user?.email) {
    return privateNoStoreJson({ error: "Unauthorized" }, 401);
  }

  const { data: invitations, error } = await supabase
    .from("workspace_invitations")
    .select("id, workspace_id, email, role, expires_at, created_at")
    .eq("email", user.email.toLowerCase())
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Pending invitations lookup failed:", error);
    return privateNoStoreJson({ error: "Unable to load invitations." }, 500);
  }

  const workspaceIds = [
    ...new Set((invitations ?? []).map((item) => item.workspace_id)),
  ];

  const { data: workspaces, error: workspaceError } = workspaceIds.length
    ? await supabase
        .from("workspaces")
        .select("id, name")
        .in("id", workspaceIds)
    : { data: [], error: null };

  if (workspaceError) {
    console.error("Pending invitation workspace lookup failed:", workspaceError);
    return privateNoStoreJson(
      { error: "Unable to load workspace details." },
      500,
    );
  }

  const workspaceNames = new Map(
    (workspaces ?? []).map((workspace) => [workspace.id, workspace.name]),
  );

  return privateNoStoreJson({
    invitations: (invitations ?? []).map((invitation) => ({
      ...invitation,
      workspaceName: workspaceNames.get(invitation.workspace_id) ?? "Workspace",
    })),
  });
}
