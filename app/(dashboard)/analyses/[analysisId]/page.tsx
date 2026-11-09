import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import {
  ArrowLeft,
  AlertCircle,
  MessageSquare,
  Layers3,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Analysis details",
};

type Priority = "critical" | "high" | "medium" | "low";

const priorityStyles: Record<Priority, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-green-200 bg-green-50 text-green-700",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function AnalysisContent({ analysisId }: { analysisId: string }) {
  await connection();

  const workspaceResult = await getUserWorkspace();

  if (!workspaceResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load analysis</CardTitle>
          <CardDescription>{workspaceResult.error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { data: analysis, error: analysisError } = await supabase
    .from("analyses")
    .select("id, title, status, total_feedback, created_at")
    .eq("id", analysisId)
    .eq("workspace_id", workspaceResult.workspaceId)
    .maybeSingle();

  if (analysisError) {
    console.error("Analysis lookup failed:", analysisError);
    throw new Error("Unable to load analysis");
  }

  if (!analysis) notFound();

  const [feedbackResult, clusterResult] = await Promise.all([
    supabase
      .from("feedback_entries")
      .select(
        "id, original_text, source, sentiment, category, severity, reason, issue_key, created_at",
      )
      .eq("analysis_id", analysis.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("issue_clusters")
      .select("id, title, description, priority, created_at")
      .eq("analysis_id", analysis.id)
      .order("created_at", { ascending: false }),
  ]);

  if (feedbackResult.error || clusterResult.error) {
    console.error(
      "Analysis detail lookup failed:",
      feedbackResult.error ?? clusterResult.error,
    );
    throw new Error("Unable to load analysis details");
  }

  const feedback = feedbackResult.data ?? [];
  const clusters = clusterResult.data ?? [];

  const positive = feedback.filter(
    (item) => item.sentiment === "positive",
  ).length;

  const neutral = feedback.filter(
    (item) => item.sentiment === "neutral",
  ).length;

  const negative = feedback.filter(
    (item) => item.sentiment === "negative",
  ).length;

  const critical = clusters.filter(
    (item) => item.priority === "critical",
  ).length;

  return (
    <div className="space-y-8">
      {/* Navigation and heading */}
      <div className="space-y-4">
        <Link
          href="/overview"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to overview
        </Link>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4" />
              Feedback analysis
            </div>

            <h1 className="break-words text-2xl font-semibold tracking-tight">
              {analysis.title}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Created {formatDate(analysis.created_at)}
            </p>
          </div>

          <Badge
            variant={
              analysis.status === "completed"
                ? "secondary"
                : analysis.status === "failed"
                  ? "destructive"
                  : "outline"
            }
            className="w-fit capitalize"
          >
            {analysis.status}
          </Badge>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Feedback analyzed",
            value: feedback.length,
            icon: MessageSquare,
          },
          {
            label: "Issues discovered",
            value: clusters.length,
            icon: Layers3,
          },
          {
            label: "Critical issues",
            value: critical,
            icon: AlertCircle,
          },
          {
            label: "Negative feedback",
            value: negative,
            icon: MessageSquare,
          },
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <Card key={metric.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {metric.label}
                  </p>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-3xl font-semibold tabular-nums">
                  {metric.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sentiment */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment breakdown</CardTitle>
          <CardDescription>
            How customers feel about the product in this analysis.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {feedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No feedback entries found.
            </p>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(positive / feedback.length) * 100}%` }}
                />
                <div
                  className="bg-amber-400"
                  style={{ width: `${(neutral / feedback.length) * 100}%` }}
                />
                <div
                  className="bg-rose-500"
                  style={{ width: `${(negative / feedback.length) * 100}%` }}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: "Positive",
                    value: positive,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "Neutral",
                    value: neutral,
                    color: "bg-amber-400",
                  },
                  {
                    label: "Negative",
                    value: negative,
                    color: "bg-rose-500",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className={`size-2.5 rounded-full ${item.color}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="font-semibold tabular-nums">
                        {item.value}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({Math.round((item.value / feedback.length) * 100)}%)
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detected issues */}
      <Card>
        <CardHeader>
          <CardTitle>Detected issues</CardTitle>
          <CardDescription>
            Recurring problems identified in this analysis.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {clusters.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No issues were detected.
            </p>
          ) : (
            <div className="divide-y">
              {clusters.map((cluster) => {
                const priority = cluster.priority as Priority;

                return (
                  <div
                    key={cluster.id}
                    className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{cluster.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {cluster.description}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={`w-fit shrink-0 capitalize ${priorityStyles[priority] ?? ""}`}
                    >
                      {cluster.priority}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Customer feedback</CardTitle>
          <CardDescription>Individual entries analyzed by AI.</CardDescription>
        </CardHeader>

        <CardContent>
          {feedback.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No feedback entries found.
            </p>
          ) : (
            <div className="space-y-3">
              {feedback.map((item) => (
                <div key={item.id} className="space-y-3 rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {item.sentiment}
                      </Badge>

                      <Badge variant="secondary" className="capitalize">
                        {item.category.replaceAll("_", " ")}
                      </Badge>
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {item.source || "Unknown source"}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed">
                    {item.original_text}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                    <span>Severity: {item.severity}/5</span>
                    <span>Issue: {item.issue_key}</span>
                  </div>

                  {item.reason && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        AI reasoning
                      </p>
                      <p className="text-sm">{item.reason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  const { analysisId } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      analysisId,
    )
  ) {
    notFound();
  }

  return (
    <Suspense fallback={<AnalysisLoading />}>
      <AnalysisContent analysisId={analysisId} />
    </Suspense>
  );
}
