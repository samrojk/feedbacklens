import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";
import { supabase } from "@/lib/supabase/server";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json(
      { error: "Unable to load invitations." },
      { status: 500 },
    );
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
    return NextResponse.json(
      { error: "Unable to load workspace details." },
      { status: 500 },
    );
  }

  const workspaceNames = new Map(
    (workspaces ?? []).map((workspace) => [workspace.id, workspace.name]),
  );

  return NextResponse.json({
    invitations: (invitations ?? []).map((invitation) => ({
      ...invitation,
      workspaceName: workspaceNames.get(invitation.workspace_id) ?? "Workspace",
    })),
  });
}
