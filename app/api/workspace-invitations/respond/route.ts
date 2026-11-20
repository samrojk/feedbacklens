import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";
import { supabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const invitationId = body.invitationId;
    const action = body.action;

    if (
      typeof invitationId !== "string" ||
      !["accept", "decline"].includes(action)
    ) {
      return NextResponse.json(
        { error: "Invalid invitation response." },
        { status: 400 },
      );
    }

    const { data: invitation, error } = await supabase
      .from("workspace_invitations")
      .select("id, workspace_id, email, role, status, expires_at")
      .eq("id", invitationId)
      .eq("status", "pending")
      .maybeSingle();

    if (error) throw error;

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found or already processed." },
        { status: 404 },
      );
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation belongs to another email address." },
        { status: 403 },
      );
    }

    if (new Date(invitation.expires_at) <= new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired." },
        { status: 410 },
      );
    }

    if (action === "decline") {
      const { error: declineError } = await supabase
        .from("workspace_invitations")
        .update({ status: "declined" })
        .eq("id", invitation.id)
        .eq("status", "pending");

      if (declineError) throw declineError;

      return NextResponse.json({ success: true, status: "declined" });
    }

    const { data: existingMember, error: memberCheckError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", invitation.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberCheckError) throw memberCheckError;

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this workspace." },
        { status: 409 },
      );
    }

    const { error: insertError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (insertError) throw insertError;

    const { error: acceptError } = await supabase
      .from("workspace_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id)
      .eq("status", "pending");

    if (acceptError) {
      await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", invitation.workspace_id)
        .eq("user_id", user.id);

      throw acceptError;
    }

    return NextResponse.json({ success: true, status: "accepted" });
  } catch (error) {
    console.error("Invitation response failed:", error);

    return NextResponse.json(
      { error: "Unable to process invitation." },
      { status: 500 },
    );
  }
}
