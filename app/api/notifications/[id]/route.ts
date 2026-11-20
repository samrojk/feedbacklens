import { NextRequest, NextResponse } from "next/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";
import { supabase } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: NextRequest, { params }: RouteContext) {
  const access = await getUserWorkspace();

  if (!access.success) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: access.status },
    );
  }

  try {
    const { id } = await params;
    const { user, workspaceId } = access;

    // Validate notification ID.
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid notification ID." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .is("read_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("id, read_at")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Notification not found, expired, or already read." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      notification: data,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return NextResponse.json(
      { error: "Unable to update notification." },
      { status: 500 },
    );
  }
}
