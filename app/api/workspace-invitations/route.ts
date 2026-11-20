import { NextRequest, NextResponse } from "next/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";
import { supabase } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";

const allowedRoles = ["admin", "member", "viewer"] as const;

export async function GET() {
  const access = await getUserWorkspace();

  if (!access.success) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: access.status },
    );
  }

  const { data, error } = await supabase
    .from("workspace_invitations")
    .select("id, email, role, status, expires_at, created_at")
    .eq("workspace_id", access.workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch invitations error:", error);
    return NextResponse.json(
      { error: "Could not fetch invitations." },
      { status: 500 },
    );
  }

  return NextResponse.json({ invitations: data });
}

export async function POST(request: NextRequest) {
  const access = await getUserWorkspace();

  if (!access.success) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: access.status },
    );
  }

  const { user, workspaceId, role: currentRole } = access;

  if (!["owner", "admin"].includes(currentRole)) {
    return NextResponse.json(
      { error: "You don't have permission to invite members." },
      { status: 403 },
    );
  }

  let invitationId: string | null = null;

  try {
    const body = await request.json();

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const role = body.role;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    if (
      typeof role !== "string" ||
      !allowedRoles.includes(role as (typeof allowedRoles)[number])
    ) {
      return NextResponse.json(
        { error: "Invalid member role." },
        { status: 400 },
      );
    }

    if (currentRole === "admin" && role === "admin") {
      return NextResponse.json(
        { error: "Only workspace owners can invite admins." },
        { status: 403 },
      );
    }

    // Prevent duplicate pending invitations.
    const { data: existing, error: existingError } = await supabase
      .from("workspace_invitations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return NextResponse.json(
        { error: "An active invitation already exists for this email." },
        { status: 409 },
      );
    }

    // Create invitation record.
    const { data: invitation, error: insertError } = await supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email,
        role,
        invited_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !invitation) {
      throw insertError ?? new Error("Could not create invitation.");
    }

    invitationId = invitation.id;

    // Check whether this email already belongs to a FeedbackLens account.
    let existingUser: { id: string } | null = null;

    for (let page = 1; page <= 10; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (error) throw error;

      const match = data.users.find(
        (account) => account.email?.toLowerCase() === email,
      );

      if (match) {
        existingUser = { id: match.id };
        break;
      }

      if (data.users.length < 1000) break;
    }

    if (existingUser) {
      const { data: membership, error: membershipError } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (membership) {
        return NextResponse.json(
          { error: "This user is already a workspace member." },
          { status: 409 },
        );
      }

      await createNotification({
        workspaceId,
        userId: existingUser.id,
        type: "invitation",
        title: "Workspace invitation",
        message: `You've been invited to join a workspace as ${role}.`,
        actionUrl: "/invitations",
        metadata: { invitationId: invitation.id, role },
      });

      invitationId = null;

      return NextResponse.json({
        success: true,
        message: `Invitation sent to ${email}.`,
        invitationId: invitation.id,
      });
    }

    // New users receive an email invitation.
    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.searchParams.set("invitation_id", invitation.id);

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          workspace_invitation_id: invitation.id,
        },
        redirectTo: callbackUrl.toString(),
      },
    );

    if (inviteError) throw inviteError;

    invitationId = null;

    return NextResponse.json(
      {
        success: true,
        message: `Invitation sent to ${email}.`,
        invitationId: invitation.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Workspace invitation error:", error);

    // Clean up the pending invitation if the operation failed.
    if (invitationId) {
      await supabase
        .from("workspace_invitations")
        .delete()
        .eq("id", invitationId);
    }

    return NextResponse.json(
      { error: "Something went wrong while sending the invitation." },
      { status: 500 },
    );
  }
}
