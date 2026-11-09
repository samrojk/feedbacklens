import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import {
  Layers3,
  ArrowUpRight,
  AlertCircle,
  CircleDot,
  TrendingUp,
} from "lucide-react";

import { supabase } from "@/lib/supabase/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";

export const metadata = {
  title: "Issues",
};

type Priority = "low" | "medium" | "high" | "critical";

type IssueCluster = {
  id: string;
  analysis_id: string;
  title: string;
  description: string;
  priority: Priority;
  created_at: string;
};

const priorityStyles: Record<Priority, string> = {
  critical: "bg-red-50 text-red-700 border-red-100",
  high: "bg-orange-50 text-orange-700 border-orange-100",
  medium: "bg-amber-50 text-amber-700 border-amber-100",
  low: "bg-green-50 text-green-700 border-green-100",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function IssuesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-md bg-muted" />
        <div className="h-4 w-72 rounded-md bg-muted" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl border bg-card" />
        ))}
      </div>

      <div className="h-72 rounded-xl border bg-card" />
    </div>
  );
}

export default function IssuesPage() {
  return (
    <Suspense fallback={<IssuesLoading />}>
      <IssuesContent />
    </Suspense>
  );
}

async function IssuesContent() {
  // Prevent prerendering before any request-time operations.
  await connection();

  const workspaceResult = await getUserWorkspace();

  if (!workspaceResult.success) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <h1 className="font-semibold">Unable to load issues</h1>
        <p className="mt-2 text-sm text-neutral-500">{workspaceResult.error}</p>
      </div>
    );
  }

  // Fetch analyses belonging to the authenticated workspace.
  const { data: analysesData, error: analysisError } = await supabase
    .from("analyses")
    .select("id, title, created_at")
    .eq("workspace_id", workspaceResult.workspaceId)
    .order("created_at", { ascending: false });

  if (analysisError) {
    console.error("Issue analysis lookup failed:", analysisError);
    throw new Error("Unable to load issue analyses");
  }

  const analyses = analysesData ?? [];
  const analysisIds = analyses.map((item) => item.id);

  // Fetch issue clusters.
  let clusters: IssueCluster[] = [];

  if (analysisIds.length > 0) {
    const { data, error } = await supabase
      .from("issue_clusters")
      .select("id, analysis_id, title, description, priority, created_at")
      .in("analysis_id", analysisIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Issue clusters lookup failed:", error);
      throw new Error("Unable to load issue clusters");
    }

    clusters = (data ?? []) as IssueCluster[];
  }

  // Fetch feedback-to-cluster relationships.
  const clusterIds = clusters.map((cluster) => cluster.id);

  let feedbackLinks: { cluster_id: string; feedback_id: string }[] = [];

  if (clusterIds.length > 0) {
    const { data, error } = await supabase
      .from("cluster_feedback")
      .select("cluster_id, feedback_id")
      .in("cluster_id", clusterIds);

    if (error) {
      console.error("Issue feedback lookup failed:", error);
      throw new Error("Unable to load issue feedback counts");
    }

    feedbackLinks = data ?? [];
  }

  // Prepare display data.
  const analysisMap = new Map(
    analyses.map((analysis) => [analysis.id, analysis.title]),
  );

  const feedbackCounts = new Map<string, number>();

  for (const link of feedbackLinks) {
    feedbackCounts.set(
      link.cluster_id,
      (feedbackCounts.get(link.cluster_id) ?? 0) + 1,
    );
  }

  const getCount = (id: string) => feedbackCounts.get(id) ?? 0;

  const criticalCount = clusters.filter(
    (item) => item.priority === "critical",
  ).length;

  const highCount = clusters.filter((item) => item.priority === "high").length;

  const mediumCount = clusters.filter(
    (item) => item.priority === "medium",
  ).length;

  const lowCount = clusters.filter((item) => item.priority === "low").length;

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-orange-600">
            <Layers3 size={16} />
            Product intelligence
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Issues</h1>

          <p className="mt-1 text-sm text-neutral-500">
            Discover recurring customer problems and prioritize what to fix.
          </p>
        </div>

        <Link
          href="/feedback"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Import feedback
          <ArrowUpRight size={16} />
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total issues",
            value: clusters.length,
            icon: Layers3,
            color: "text-neutral-700 bg-neutral-100",
          },
          {
            label: "Critical",
            value: criticalCount,
            icon: AlertCircle,
            color: "text-red-600 bg-red-50",
          },
          {
            label: "High priority",
            value: highCount,
            icon: TrendingUp,
            color: "text-orange-600 bg-orange-50",
          },
          {
            label: "Medium / Low",
            value: mediumCount + lowCount,
            icon: CircleDot,
            color: "text-blue-600 bg-blue-50",
          },
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className="rounded-xl border border-neutral-200 bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500">{metric.label}</p>
                <div className={`rounded-lg p-2 ${metric.color}`}>
                  <Icon size={17} />
                </div>
              </div>

              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Issues table */}
      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 p-5">
          <div>
            <h2 className="font-semibold">Detected issues</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Issues identified across your feedback analyses.
            </p>
          </div>

          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
            {clusters.length} issues
          </span>
        </div>

        {clusters.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Layers3 size={22} />
            </div>

            <h3 className="font-medium">No issues discovered yet</h3>

            <p className="mt-2 max-w-sm text-sm text-neutral-500">
              Import customer feedback to identify recurring problems,
              understand their severity and prioritize improvements.
            </p>

            <Link
              href="/feedback"
              className="mt-5 text-sm font-medium text-orange-600 hover:underline"
            >
              Import your first feedback file →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-neutral-50/70 text-xs text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Issue</th>
                  <th className="px-5 py-3 font-medium">Priority</th>
                  <th className="px-5 py-3 font-medium">Feedback</th>
                  <th className="px-5 py-3 font-medium">Analysis</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {clusters.map((cluster) => (
                  <tr
                    key={cluster.id}
                    className="transition hover:bg-neutral-50"
                  >
                    <td className="min-w-60 px-5 py-4">
                      <p className="font-medium text-neutral-900">
                        {cluster.title}
                      </p>
                      <p className="mt-1 max-w-sm truncate text-xs text-neutral-500">
                        {cluster.description}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${priorityStyles[cluster.priority]}`}
                      >
                        {cluster.priority}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-medium tabular-nums">
                      {getCount(cluster.id)}
                    </td>

                    <td className="px-5 py-4 text-neutral-500">
                      {analysisMap.get(cluster.analysis_id) ?? "Unknown"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-neutral-500">
                      {formatDate(cluster.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
