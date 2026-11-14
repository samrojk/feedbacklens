import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { supabase } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/auth-server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";

const profileSchema = z.object({
  section: z.literal("profile"),
  fullName: z.string().trim().min(2).max(100),
});

const workspaceSchema = z.object({
  section: z.literal("workspace"),
  workspaceName: z.string().trim().min(2).max(100),
});

const passwordSchema = z.object({
  section: z.literal("password"),
  password: z.string().min(8).max(128),
});

export async function PATCH(request: NextRequest) {
  try {
    const workspaceResult = await getUserWorkspace();

    if (!workspaceResult.success) {
      return NextResponse.json(
        { error: workspaceResult.error },
        { status: workspaceResult.status },
      );
    }

    const body: unknown = await request.json();

    const profile = profileSchema.safeParse(body);
    const workspace = workspaceSchema.safeParse(body);
    const password = passwordSchema.safeParse(body);

    if (profile.success) {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.data.fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workspaceResult.user.id);

      if (error) {
        console.error("Profile update failed:", error);
        return NextResponse.json(
          { error: "Unable to update profile." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Profile updated successfully.",
      });
    }

    if (workspace.success) {
      if (!["owner", "admin"].includes(workspaceResult.role)) {
        return NextResponse.json(
          {
            error: "Only workspace owners and admins can rename the workspace.",
          },
          { status: 403 },
        );
      }

      const { error } = await supabase
        .from("workspaces")
        .update({ name: workspace.data.workspaceName })
        .eq("id", workspaceResult.workspaceId);

      if (error) {
        console.error("Workspace update failed:", error);
        return NextResponse.json(
          { error: "Unable to update workspace." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Workspace updated successfully.",
      });
    }

    if (password.success) {
      const authClient = await createClient();

      const { error } = await authClient.auth.updateUser({
        password: password.data.password,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "Password updated successfully.",
      });
    }

    return NextResponse.json(
      { error: "Invalid settings data." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Settings API error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
