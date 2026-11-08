import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";

export async function GET() {
  try {
    // 1. Resolve authenticated user's workspace
    const result = await getUserWorkspace();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    // 2. Fetch analyses belonging to that workspace
    const { data: analyses, error } = await supabase
      .from("analyses")
      .select(
        `
        id,
        title,
        status,
        total_feedback,
        created_at,
        issue_clusters(id)
      `,
      )
      .eq("workspace_id", result.workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    // 3. Format response
    const data = analyses.map((analysis) => ({
      id: analysis.id,
      title: analysis.title,
      status: analysis.status,
      totalFeedback: analysis.total_feedback,
      totalClusters: analysis.issue_clusters.length,
      createdAt: analysis.created_at,
    }));

    return NextResponse.json({
      success: true,
      workspace: result.workspace,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Analysis listing failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to retrieve analyses" },
      { status: 500 },
    );
  }
}
