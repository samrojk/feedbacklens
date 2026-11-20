import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { unstable_rethrow } from "next/navigation";

import { supabase } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";

const switchSchema = z.object({
  workspaceId: z.string().uuid(),
});

function privateNoStoreJson(body: unknown, status?: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return privateNoStoreJson({ error: "Unauthorized" }, 401);
    }

    const [
      { data: profile, error: profileError },
      { data: memberships, error: membershipError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("default_workspace_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", user.id),
    ]);

    if (profileError || membershipError) {
      throw profileError ?? membershipError;
    }

    const workspaceIds = (memberships ?? []).map(
      (membership) => membership.workspace_id,
    );

    if (workspaceIds.length === 0) {
      return privateNoStoreJson({
        workspaces: [],
        activeWorkspaceId: null,
      });
    }

    const { data: workspaces, error } = await supabase
      .from("workspaces")
      .select("id, name")
      .in("id", workspaceIds);

    if (error) throw error;

    const roleMap = new Map(
      (memberships ?? []).map((membership) => [
        membership.workspace_id,
        membership.role,
      ]),
    );

    return privateNoStoreJson({
      workspaces: (workspaces ?? []).map((workspace) => ({
        ...workspace,
        role: roleMap.get(workspace.id),
      })),
      activeWorkspaceId: profile?.default_workspace_id ?? null,
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("Workspace listing failed:", error);

    return privateNoStoreJson(
      { error: "Unable to load workspaces." },
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = switchSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid workspace selection." },
        { status: 400 },
      );
    }

    const { workspaceId } = parsed.data;

    // Verify membership before changing the active workspace.
    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership) {
      return NextResponse.json(
        { error: "You do not have access to this workspace." },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({ default_workspace_id: workspaceId })
      .eq("id", user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      workspaceId,
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("Workspace switch failed:", error);

    return NextResponse.json(
      { error: "Unable to switch workspace." },
      { status: 500 },
    );
  }
}
