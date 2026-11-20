import { NextRequest, NextResponse } from "next/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";
import { supabase } from "@/lib/supabase/server";

const allowedRoles = ["admin", "member", "viewer"];

export async function PATCH(request: NextRequest) {
  const access = await getUserWorkspace();

  if (!access.success) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  try {
    const body = await request.json();
    const { user, workspaceId, role } = access;

    // Workspace deletion is strictly owner-only.
    if (body.action === "schedule-deletion") {
      if (role !== "owner") {
        return NextResponse.json(
          { error: "Only the workspace owner can schedule deletion." },
          { status: 403 },
        );
      }

      const { data: workspace, error: lookupError } = await supabase
        .from("workspaces")
        .select("deletion_scheduled_for")
        .eq("id", workspaceId)
        .single();

      if (lookupError) throw lookupError;

      if (workspace.deletion_scheduled_for) {
        return NextResponse.json(
          { error: "Deletion is already scheduled." },
          { status: 409 },
        );
      }

      const now = new Date();
      const deadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from("workspaces")
        .update({
          deletion_requested_at: now.toISOString(),
          deletion_scheduled_for: deadline.toISOString(),
          deletion_requested_by: user.id,
        })
        .eq("id", workspaceId);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        deletionScheduledFor: deadline.toISOString(),
      });
    }

    if (body.action === "cancel-deletion") {
      if (role !== "owner") {
        return NextResponse.json(
          { error: "Only the workspace owner can cancel deletion." },
          { status: 403 },
        );
      }

      const { error } = await supabase
        .from("workspaces")
        .update({
          deletion_requested_at: null,
          deletion_scheduled_for: null,
          deletion_requested_by: null,
        })
        .eq("id", workspaceId);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    if (body.action === "change-role") {
      const { userId, newRole } = body;

      if (!["owner", "admin"].includes(role)) {
        return NextResponse.json(
          { error: "You cannot manage members." },
          { status: 403 },
        );
      }

      if (
        typeof userId !== "string" ||
        !allowedRoles.includes(newRole) ||
        userId === user.id
      ) {
        return NextResponse.json(
          { error: "Invalid member or role." },
          { status: 400 },
        );
      }

      const { data: target, error: targetError } = await supabase
        .from("workspace_members")
        .select("id, role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();

      if (targetError) throw targetError;
      if (!target)
        return NextResponse.json(
          { error: "Member not found." },
          { status: 404 },
        );

      if (
        target.role === "owner" ||
        (role === "admin" && target.role === "admin")
      ) {
        return NextResponse.json(
          { error: "You cannot change this member's role." },
          { status: 403 },
        );
      }

      if (role === "admin" && newRole === "admin") {
        return NextResponse.json(
          { error: "Only owners can assign admin roles." },
          { status: 403 },
        );
      }

      const { error } = await supabase
        .from("workspace_members")
        .update({ role: newRole })
        .eq("id", target.id);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("Workspace management error:", error);
    return NextResponse.json(
      { error: "Unable to update workspace." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const access = await getUserWorkspace();

  if (!access.success) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  try {
    const { user, workspaceId, role } = access;
    const userId = new URL(request.url).searchParams.get("userId");

    if (!["owner", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "You cannot remove members." },
        { status: 403 },
      );
    }

    if (!userId || userId === user.id) {
      return NextResponse.json({ error: "Invalid member." }, { status: 400 });
    }

    const { data: target, error: lookupError } = await supabase
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!target)
      return NextResponse.json({ error: "Member not found." }, { status: 404 });

    if (
      target.role === "owner" ||
      (role === "admin" && target.role === "admin")
    ) {
      return NextResponse.json(
        { error: "You cannot remove this member." },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("id", target.id);

    if (error) throw error;

    // If this was their active workspace, clear their selection.
    await supabase
      .from("profiles")
      .update({ default_workspace_id: null })
      .eq("id", userId)
      .eq("default_workspace_id", workspaceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove workspace member error:", error);
    return NextResponse.json(
      { error: "Unable to remove member." },
      { status: 500 },
    );
  }
}
