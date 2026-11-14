import { NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";
import { getAnalysisDetailsForWorkspace } from "@/lib/supabase/dashboard-data";

interface RouteContext {
  params: Promise<{
    analysisId: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    // 1. Resolve authenticated user's workspace
    const result = await getUserWorkspace();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    const { analysisId } = await params;

    // 2. Validate UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(analysisId)) {
      return NextResponse.json(
        { success: false, error: "Invalid analysis ID" },
        { status: 400 },
      );
    }

    const details = await getAnalysisDetailsForWorkspace(
      result.workspaceId,
      analysisId,
    );

    if (!details) {
      return NextResponse.json(
        { success: false, error: "Analysis not found" },
        { status: 404 },
      );
    }

    const { analysis, feedback, clusters, feedbackLinks: links } = details;

    const feedbackMap = new Map(feedback.map((entry) => [entry.id, entry]));

    const issueClusters = clusters.map((cluster) => {
      const linkedFeedback = links
        .filter((link) => link.cluster_id === cluster.id)
        .map((link) => feedbackMap.get(link.feedback_id))
        .filter((entry) => entry !== undefined);

      return {
        ...cluster,
        feedback: linkedFeedback,
        feedbackCount: linkedFeedback.length,
      };
    });

    return NextResponse.json({
      success: true,
      workspace: result.workspace,
      data: {
        analysis,
        summary: {
          totalFeedback: feedback.length,
          totalClusters: clusters.length,
        },
        feedback,
        issueClusters,
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("Analysis retrieval failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to retrieve analysis" },
      { status: 500 },
    );
  }
}
