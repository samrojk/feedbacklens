import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    analysisId: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { analysisId } = await params;
    const workspaceId = process.env.FEEDBACKLENS_WORKSPACE_ID;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace configuration missing" },
        { status: 500 },
      );
    }

    // Validate analysis UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(analysisId)) {
      return NextResponse.json(
        { success: false, error: "Invalid analysis ID" },
        { status: 400 },
      );
    }

    // 1. Fetch analysis, restricted to the configured workspace
    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", analysisId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (analysisError) throw analysisError;

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: "Analysis not found" },
        { status: 404 },
      );
    }

    // 2. Fetch feedback entries
    const { data: feedback, error: feedbackError } = await supabase
      .from("feedback_entries")
      .select("*")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false });

    if (feedbackError) throw feedbackError;

    // 3. Fetch issue clusters
    const { data: clusters, error: clusterError } = await supabase
      .from("issue_clusters")
      .select("*")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false });

    if (clusterError) throw clusterError;

    // 4. Fetch cluster-feedback relationships
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

    // 5. Attach feedback entries to their respective clusters
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

    // 6. Return complete analysis
    return NextResponse.json({
      success: true,
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
      {
        success: false,
        error: "Failed to retrieve analysis",
      },
      { status: 500 },
    );
  }
}
