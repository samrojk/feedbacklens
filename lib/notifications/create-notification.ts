import "server-only";

import { supabase } from "@/lib/supabase/server";

type NotificationType =
  | "invitation"
  | "usage"
  | "analysis"
  | "workspace"
  | "security"
  | "system";

type CreateNotificationInput = {
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  severity?: "critical" | "warning" | "info" | "success";
  actionUrl?: string;
  metadata?: Record<string, unknown>;
};

const preferenceForType: Record<NotificationType, string> = {
  invitation: "workspace_notifications",
  workspace: "workspace_notifications",
  analysis: "analysis_notifications",
  usage: "usage_notifications",
  security: "security_notifications",
  system: "system_notifications",
};

export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    const { data: preferences, error: preferenceError } = await supabase
      .from("notification_preferences")
      .select(
        "in_app_enabled, analysis_notifications, workspace_notifications, usage_notifications, security_notifications, system_notifications",
      )
      .eq("user_id", input.userId)
      .eq("workspace_id", input.workspaceId)
      .maybeSingle();

    if (preferenceError) throw preferenceError;

    // No saved preferences means notifications are enabled by default.
    if (preferences) {
      const categoryEnabled =
        preferences[preferenceForType[input.type] as keyof typeof preferences];

      if (!preferences.in_app_enabled || categoryEnabled === false) return;
    }

    const { error } = await supabase.from("notifications").insert({
      workspace_id: input.workspaceId,
      user_id: input.userId,
      type: input.type,
      severity: input.severity ?? "info",
      title: input.title,
      message: input.message,
      action_url: input.actionUrl ?? null,
      metadata: input.metadata ?? {},
    });

    if (error) throw error;
  } catch (error) {
    // Notification failures must never break the main application workflow.
    console.error("Notification creation failed:", error);
  }
}
