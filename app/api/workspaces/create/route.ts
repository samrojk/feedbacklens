import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";
import { supabase } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Workspace name must be 2–100 characters." },
      { status: 400 },
    );
  }

  // Don't create another workspace if the user already belongs to one.
  const { data: existing } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already belong to a workspace." },
      { status: 409 },
    );
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: parsed.data.name })
    .select("id")
    .single();

  if (workspaceError || !workspace) {
    console.error(workspaceError);
    return NextResponse.json(
      { error: "Could not create workspace." },
      { status: 500 },
    );
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    await supabase.from("workspaces").delete().eq("id", workspace.id);
    console.error(memberError);
    return NextResponse.json(
      { error: "Could not create workspace membership." },
      { status: 500 },
    );
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ default_workspace_id: workspace.id })
    .eq("id", user.id);

  if (profileError) {
    await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("user_id", user.id);
    await supabase.from("workspaces").delete().eq("id", workspace.id);

    console.error(profileError);
    return NextResponse.json(
      { error: "Could not set default workspace." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, workspaceId: workspace.id });
}
