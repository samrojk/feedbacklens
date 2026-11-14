import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { getRecentAnalysesForCurrentWorkspace } from "@/lib/supabase/dashboard-data";

export async function GET() {
  try {
    const result = await getRecentAnalysesForCurrentWorkspace();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    const data = result.analyses.map((analysis) => ({
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
    unstable_rethrow(error);
    console.error("Analysis listing failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to retrieve analyses" },
      { status: 500 },
    );
  }
}
