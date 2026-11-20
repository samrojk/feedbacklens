import { NextRequest, NextResponse } from "next/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";
import { supabase } from "@/lib/supabase/server";

export async function GET() {
  const access = await getUserWorkspace();

  if (!access.success) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: access.status },
    );
  }

  const { user, workspaceId, role } = access;

  try {
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();

    const canManageWorkspace = ["owner", "admin"].includes(role);

    const [notificationResult, usageResult, invitationResult] =
      await Promise.all([
        supabase
          .from("notifications")
          .select(
            "id, type, severity, title, message, action_url, metadata, read_at, expires_at, created_at",
          )
          .eq("workspace_id", workspaceId)
          .eq("user_id", user.id)
          .gt("expires_at", now.toISOString())
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("workspace_usage_events")
          .select(
            "provider, model, operation, status, request_count, input_tokens, output_tokens, created_at",
          )
          .eq("workspace_id", workspaceId)
          .gte("created_at", monthStart)
          .order("created_at", { ascending: false }),

        canManageWorkspace
          ? supabase
              .from("workspace_invitations")
              .select(
                "id, email, role, status, expires_at, created_at, accepted_at",
              )
              .eq("workspace_id", workspaceId)
              .order("created_at", { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (notificationResult.error) throw notificationResult.error;
    if (usageResult.error) throw usageResult.error;
    if (invitationResult.error) throw invitationResult.error;

    const notifications = notificationResult.data ?? [];
    const usageEvents = usageResult.data ?? [];
    const invitations = invitationResult.data ?? [];

    const usage = usageEvents.reduce(
      (totals, event) => {
        totals.requests += event.request_count;
        totals.inputTokens += Number(event.input_tokens);
        totals.outputTokens += Number(event.output_tokens);

        if (event.status === "success") {
          totals.successfulRequests += event.request_count;
        } else {
          totals.failedRequests += event.request_count;
        }

        return totals;
      },
      {
        requests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        inputTokens: 0,
        outputTokens: 0,
      },
    );

    const modelUsage = Object.values(
      usageEvents.reduce<
        Record<
          string,
          {
            provider: string;
            model: string;
            requests: number;
            inputTokens: number;
            outputTokens: number;
          }
        >
      >((groups, event) => {
        const key = `${event.provider}:${event.model}`;

        if (!groups[key]) {
          groups[key] = {
            provider: event.provider,
            model: event.model,
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
          };
        }

        groups[key].requests += event.request_count;
        groups[key].inputTokens += Number(event.input_tokens);
        groups[key].outputTokens += Number(event.output_tokens);

        return groups;
      }, {}),
    );

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((item) => !item.read_at).length,
      invitations,
      usage: {
        period: "current_month",
        ...usage,
        modelBreakdown: modelUsage,
      },
    });
  } catch (error) {
    console.error("Notifications API error:", error);

    return NextResponse.json(
      { error: "Unable to load notification center." },
      { status: 500 },
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
