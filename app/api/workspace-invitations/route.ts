import { NextRequest, NextResponse } from "next/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";
import { supabase } from "@/lib/supabase/server";

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
    return NextResponse.json(
      { error: "Could not fetch invitations" },
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

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid member role." },
        { status: 400 },
      );
    }

    // Admins cannot invite other admins.
    if (currentRole === "admin" && role === "admin") {
      return NextResponse.json(
        { error: "Only workspace owners can invite admins." },
        { status: 403 },
      );
    }

    // Prevent duplicate pending invitations.
    const { data: existing } = await supabase
      .from("workspace_invitations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An active invitation already exists for this email." },
        { status: 409 },
      );
    }

    // Create the invitation record first.
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
      return NextResponse.json(
        { error: "Could not create invitation." },
        { status: 500 },
      );
    }

    // Send the invitation using Supabase Auth.
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

    if (inviteError) {
      await supabase
        .from("workspace_invitations")
        .delete()
        .eq("id", invitation.id);

      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Invitation sent to ${email}.`,
        invitationId: invitation.id,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while sending the invitation." },
      { status: 500 },
    );
  }
}
