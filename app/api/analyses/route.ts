import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const workspaceId = process.env.FEEDBACKLENS_WORKSPACE_ID;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace configuration missing" },
        { status: 500 },
      );
    }

    // Fetch analyses and their related issue clusters
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
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    // Format the response
    const results = analyses.map((analysis) => ({
      id: analysis.id,
      title: analysis.title,
      status: analysis.status,
      totalFeedback: analysis.total_feedback,
      totalClusters: analysis.issue_clusters.length,
      createdAt: analysis.created_at,
    }));

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Analysis listing failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve analyses",
      },
      { status: 500 },
    );
  }
}
