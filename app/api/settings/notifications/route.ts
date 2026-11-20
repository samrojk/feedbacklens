import { NextRequest, NextResponse } from "next/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";
import { supabase } from "@/lib/supabase/server";

const preferenceKeys = [
  "in_app_enabled",
  "email_enabled",
  "analysis_notifications",
  "workspace_notifications",
  "usage_notifications",
  "security_notifications",
  "system_notifications",
] as const;

type PreferenceKey = (typeof preferenceKeys)[number];

const defaults: Record<PreferenceKey, boolean> = {
  in_app_enabled: true,
  email_enabled: false,
  analysis_notifications: true,
  workspace_notifications: true,
  usage_notifications: true,
  security_notifications: true,
  system_notifications: true,
};

export async function GET() {
  const access = await getUserWorkspace();

  if (!access.success) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: access.status },
    );
  }

  try {
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: access.user.id,
          workspace_id: access.workspaceId,
        },
        { onConflict: "user_id,workspace_id", ignoreDuplicates: true },
      )
      .select("*")
      .maybeSingle();

    if (error) throw error;

    // If the row already existed, fetch it.
    if (!data) {
      const { data: existing, error: fetchError } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", access.user.id)
        .eq("workspace_id", access.workspaceId)
        .single();

      if (fetchError) throw fetchError;

      return NextResponse.json({ preferences: existing });
    }

    return NextResponse.json({ preferences: data });
  } catch (error) {
    console.error("Fetch notification preferences error:", error);

    return NextResponse.json(
      { error: "Unable to load notification preferences." },
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
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid preferences data." },
        { status: 400 },
      );
    }

    const updates = body as Record<string, unknown>;
    const allowedUpdates: Partial<Record<PreferenceKey, boolean>> = {};

    for (const key of preferenceKeys) {
      if (key in updates) {
        if (typeof updates[key] !== "boolean") {
          return NextResponse.json(
            { error: `Invalid value for ${key}.` },
            { status: 400 },
          );
        }

        allowedUpdates[key] = updates[key] as boolean;
      }
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json(
        { error: "No valid preference changes provided." },
        { status: 400 },
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", access.user.id)
      .eq("workspace_id", access.workspaceId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: access.user.id,
          workspace_id: access.workspaceId,
          ...defaults,
          ...existing,
          ...allowedUpdates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,workspace_id" },
      )
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      preferences: data,
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);

    return NextResponse.json(
      { error: "Unable to save notification preferences." },
      { status: 500 },
    );
  }
}
