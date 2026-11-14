import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";
import { supabase } from "@/lib/supabase/server";
import {
  analysisCacheTag,
  workspaceAnalyticsCacheTag,
} from "@/lib/supabase/cache-tags";

const DASHBOARD_CACHE_LIFE = {
  stale: 300,
  revalidate: 3600,
  expire: 7200,
} as const;

async function getAnalysesByWorkspace(
  workspaceId: string,
  limit: number | null,
) {
  "use cache";

  cacheLife(DASHBOARD_CACHE_LIFE);
  cacheTag(workspaceAnalyticsCacheTag(workspaceId));

  const query = supabase
    .from("analyses")
    .select(
      "id, title, status, total_feedback, created_at, issue_clusters(id, title, description, priority, analysis_id, created_at)",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const { data, error } = await (limit === null ? query : query.limit(limit));

  if (error) {
    console.error("Workspace analyses lookup failed:", error);
    throw new Error("Unable to load analyses");
  }

  return data ?? [];
}

async function getFeedbackByAnalysisIds(analysisIds: string[]) {
  if (analysisIds.length === 0) return [];

  const { data, error } = await supabase
    .from("feedback_entries")
    .select("id, sentiment, created_at")
    .in("analysis_id", analysisIds);

  if (error) {
    console.error("Overview feedback lookup failed:", error);
    throw new Error("Unable to load feedback data");
  }

  return data ?? [];
}

async function getFeedbackLinksByClusterIds(clusterIds: string[]) {
  if (clusterIds.length === 0) return [];

  const { data, error } = await supabase
    .from("cluster_feedback")
    .select("cluster_id, feedback_id")
    .in("cluster_id", clusterIds);

  if (error) {
    console.error("Cluster feedback lookup failed:", error);
    throw new Error("Unable to load issue feedback counts");
  }

  return data ?? [];
}

async function getOverviewDataForWorkspace(workspaceId: string) {
  "use cache";

  cacheLife(DASHBOARD_CACHE_LIFE);
  cacheTag(workspaceAnalyticsCacheTag(workspaceId));

  const analyses = await getAnalysesByWorkspace(workspaceId, 50);
  const analysisIds = analyses.map((analysis) => analysis.id);
  const clusters = analyses.flatMap((analysis) => analysis.issue_clusters ?? []);
  const clusterIds = clusters.map((cluster) => cluster.id);

  const [feedbackEntries, feedbackLinks] = await Promise.all([
    getFeedbackByAnalysisIds(analysisIds),
    getFeedbackLinksByClusterIds(clusterIds),
  ]);

  return { analyses, feedbackEntries, clusters, feedbackLinks };
}

async function getIssuesDataForWorkspace(workspaceId: string) {
  "use cache";

  cacheLife(DASHBOARD_CACHE_LIFE);
  cacheTag(workspaceAnalyticsCacheTag(workspaceId));

  const analyses = await getAnalysesByWorkspace(workspaceId, null);
  const clusters = analyses.flatMap((analysis) => analysis.issue_clusters ?? []);
  const feedbackLinks = await getFeedbackLinksByClusterIds(
    clusters.map((cluster) => cluster.id),
  );

  return { analyses, clusters, feedbackLinks };
}

export async function getAnalysisDetailsForWorkspace(
  workspaceId: string,
  analysisId: string,
) {
  "use cache";

  cacheLife(DASHBOARD_CACHE_LIFE);
  cacheTag(
    workspaceAnalyticsCacheTag(workspaceId),
    analysisCacheTag(workspaceId, analysisId),
  );

  const { data: analysis, error: analysisError } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", analysisId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (analysisError) {
    console.error("Analysis lookup failed:", analysisError);
    throw new Error("Unable to load analysis");
  }

  if (!analysis) return null;

  const [feedbackResult, clusterResult] = await Promise.all([
    supabase
      .from("feedback_entries")
      .select("*")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false }),
    supabase
      .from("issue_clusters")
      .select("*")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false }),
  ]);

  if (feedbackResult.error || clusterResult.error) {
    console.error(
      "Analysis details lookup failed:",
      feedbackResult.error ?? clusterResult.error,
    );
    throw new Error("Unable to load analysis details");
  }

  const feedback = feedbackResult.data ?? [];
  const clusters = clusterResult.data ?? [];
  const feedbackLinks = await getFeedbackLinksByClusterIds(
    clusters.map((cluster) => cluster.id),
  );

  return { analysis, feedback, clusters, feedbackLinks };
}

export async function getRecentAnalysesForCurrentWorkspace() {
  const workspaceResult = await getUserWorkspace();

  if (!workspaceResult.success) return workspaceResult;

  const analyses = await getAnalysesByWorkspace(
    workspaceResult.workspaceId,
    50,
  );

  return { ...workspaceResult, analyses };
}

export async function getOverviewDashboardData() {
  const workspaceResult = await getUserWorkspace();

  if (!workspaceResult.success) return workspaceResult;

  const data = await getOverviewDataForWorkspace(workspaceResult.workspaceId);

  return { ...workspaceResult, data };
}

export async function getIssuesDashboardData() {
  const workspaceResult = await getUserWorkspace();

  if (!workspaceResult.success) return workspaceResult;

  const data = await getIssuesDataForWorkspace(workspaceResult.workspaceId);

  return { ...workspaceResult, data };
}

export async function getAnalysisDetailsForCurrentWorkspace(
  analysisId: string,
) {
  const workspaceResult = await getUserWorkspace();

  if (!workspaceResult.success) return workspaceResult;

  const data = await getAnalysisDetailsForWorkspace(
    workspaceResult.workspaceId,
    analysisId,
  );

  return { ...workspaceResult, data };
}
