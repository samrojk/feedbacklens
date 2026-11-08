import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";

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

    // 3. Fetch analysis only from user's workspace
    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", analysisId)
      .eq("workspace_id", result.workspaceId)
      .maybeSingle();

    if (analysisError) throw analysisError;

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: "Analysis not found" },
        { status: 404 },
      );
    }

    // 4. Fetch feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from("feedback_entries")
      .select("*")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false });

    if (feedbackError) throw feedbackError;

    // 5. Fetch issue clusters
    const { data: clusters, error: clusterError } = await supabase
      .from("issue_clusters")
      .select("*")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false });

    if (clusterError) throw clusterError;

    // 6. Fetch cluster-feedback relationships
    const clusterIds = clusters.map((cluster) => cluster.id);

    let links: { cluster_id: string; feedback_id: string }[] = [];

    if (clusterIds.length > 0) {
      const { data, error: linkError } = await supabase
        .from("cluster_feedback")
        .select("cluster_id, feedback_id")
        .in("cluster_id", clusterIds);

      if (linkError) throw linkError;

      links = data;
    }

    // 7. Attach feedback to clusters
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
    console.error("Analysis retrieval failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to retrieve analysis" },
      { status: 500 },
    );
  }
}
