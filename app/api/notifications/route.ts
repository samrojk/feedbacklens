import { NextRequest, NextResponse } from "next/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";
import { supabase } from "@/lib/supabase/server";

function privateNoStoreJson(body: unknown, status?: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET() {
  const access = await getUserWorkspace();

  if (!access.success) {
    return privateNoStoreJson({ error: "Unauthorized" }, access.status);
  }

  const { user, workspaceId } = access;

  try {
    const now = new Date();
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select(
        "id, type, severity, title, message, action_url, metadata, read_at, expires_at, created_at",
      )
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .gt("expires_at", now.toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const notificationList = notifications ?? [];
    return privateNoStoreJson({
      notifications: notificationList,
      unreadCount: notificationList.filter((item) => !item.read_at).length,
    });
  } catch (error) {
    console.error("Notifications API error:", error);

    return privateNoStoreJson(
      { error: "Unable to load notification center." },
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  const access = await getUserWorkspace();

  if (!access.success) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: access.status },
    );
  }

  try {
    const body = await request.json();
    const { user, workspaceId } = access;

    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .is("read_at", null);

    if (body.markAllRead === true) {
      // Mark all unread notifications as read.
    } else if (
      typeof body.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.id,
      )
    ) {
      query = query.eq("id", body.id);
    } else {
      return NextResponse.json(
        { error: "Provide a valid notification ID or markAllRead: true." },
        { status: 400 },
      );
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return NextResponse.json(
      { error: "Unable to update notification." },
      { status: 500 },
    );
  }
}
