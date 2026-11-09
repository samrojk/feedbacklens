import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Layers3,
  MessageSquare,
  TrendingUp,
  Upload,
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
  title: "Overview",
};

type Priority = "critical" | "high" | "medium" | "low";
type Sentiment = "positive" | "negative" | "neutral";

const priorityStyles: Record<Priority, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-green-200 bg-green-50 text-green-700",
};

const sentimentStyles: Record<Sentiment, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-amber-400",
  negative: "bg-rose-500",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

async function OverviewContent() {
  await connection();

  const workspaceResult = await getUserWorkspace();

  if (!workspaceResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load dashboard</CardTitle>
          <CardDescription>{workspaceResult.error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const workspaceId = workspaceResult.workspaceId;

  // Fetch workspace analyses.
  const { data: analysesData, error: analysesError } = await supabase
    .from("analyses")
    .select("id, title, status, total_feedback, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (analysesError) {
    console.error("Overview analyses error:", analysesError);
    throw new Error("Unable to load dashboard analyses");
  }

  const analyses = analysesData ?? [];
  const analysisIds = analyses.map((item) => item.id);

  let feedbackEntries: {
    id: string;
    sentiment: string;
    created_at: string;
  }[] = [];

  let clusters: {
    id: string;
    title: string;
    description: string;
    priority: string;
    analysis_id: string;
  }[] = [];

  if (analysisIds.length > 0) {
    const [feedbackResult, clusterResult] = await Promise.all([
      supabase
        .from("feedback_entries")
        .select("id, sentiment, created_at")
        .in("analysis_id", analysisIds),

      supabase
        .from("issue_clusters")
        .select("id, title, description, priority, analysis_id")
        .in("analysis_id", analysisIds),
    ]);

    if (feedbackResult.error) {
      console.error("Overview feedback error:", feedbackResult.error);
      throw new Error("Unable to load feedback data");
    }

    if (clusterResult.error) {
      console.error("Overview clusters error:", clusterResult.error);
      throw new Error("Unable to load issue data");
    }

    feedbackEntries = feedbackResult.data ?? [];
    clusters = clusterResult.data ?? [];
  }

  // Feedback counts by sentiment.
  const positive = feedbackEntries.filter(
    (item) => item.sentiment === "positive",
  ).length;

  const negative = feedbackEntries.filter(
    (item) => item.sentiment === "negative",
  ).length;

  const neutral = feedbackEntries.filter(
    (item) => item.sentiment === "neutral",
  ).length;

  const totalFeedback = feedbackEntries.length;

  const sentimentData = [
    { label: "Positive", value: positive, color: sentimentStyles.positive },
    { label: "Neutral", value: neutral, color: sentimentStyles.neutral },
    { label: "Negative", value: negative, color: sentimentStyles.negative },
  ];

  // Issue priority counts.
  const criticalCount = clusters.filter(
    (item) => item.priority === "critical",
  ).length;

  const completedAnalyses = analyses.filter(
    (item) => item.status === "completed",
  ).length;

  // Feedback count for each issue.
  let feedbackLinks: { cluster_id: string; feedback_id: string }[] = [];

  const clusterIds = clusters.map((item) => item.id);

  if (clusterIds.length > 0) {
    const { data, error } = await supabase
      .from("cluster_feedback")
      .select("cluster_id, feedback_id")
      .in("cluster_id", clusterIds);

    if (error) {
      console.error("Overview cluster feedback error:", error);
      throw new Error("Unable to load issue feedback counts");
    }

    feedbackLinks = data ?? [];
  }

  const issueCounts = new Map<string, number>();

  for (const link of feedbackLinks) {
    issueCounts.set(
      link.cluster_id,
      (issueCounts.get(link.cluster_id) ?? 0) + 1,
    );
  }

  const topIssues = [...clusters]
    .sort((a, b) => (issueCounts.get(b.id) ?? 0) - (issueCounts.get(a.id) ?? 0))
    .slice(0, 5);

  // Last seven days of feedback activity.
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  const dailyActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    const count = feedbackEntries.filter((entry) => {
      const createdAt = new Date(entry.created_at);

      return (
        createdAt.getFullYear() === date.getFullYear() &&
        createdAt.getMonth() === date.getMonth() &&
        createdAt.getDate() === date.getDate()
      );
    }).length;

    return {
      label: new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
      }).format(date),
      count,
    };
  });

  const maxActivity = Math.max(...dailyActivity.map((item) => item.count), 1);

  const metrics = [
    {
      title: "Total feedback",
      value: totalFeedback,
      description: "Feedback entries analyzed",
      icon: MessageSquare,
    },
    {
      title: "Issues discovered",
      value: clusters.length,
      description: "Detected across analyses",
      icon: Layers3,
    },
    {
      title: "Critical issues",
      value: criticalCount,
      description: "Require immediate attention",
      icon: AlertCircle,
    },
    {
      title: "Completed analyses",
      value: completedAnalyses,
      description: "Successfully processed",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="size-4" />
            Workspace overview
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening with your customer feedback.
          </p>
        </div>

        <Link
          href="/feedback"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Upload className="size-4" />
          Import feedback
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card key={metric.title} className="gap-3 py-5">
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {metric.title}
                  </p>
                  <div className="rounded-lg bg-muted p-2">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
                  {metric.value.toLocaleString("en-IN")}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Feedback activity</CardTitle>
            <CardDescription>
              Feedback received over the last seven days.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex h-48 items-end justify-between gap-3 pt-4">
              {dailyActivity.map((day) => (
                <div
                  key={day.label}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                >
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {day.count}
                  </span>

                  <div className="flex h-32 w-full items-end justify-center">
                    <div
                      className="w-full max-w-10 rounded-t-md bg-primary/80 transition-all"
                      style={{
                        height: `${Math.max(
                          (day.count / maxActivity) * 100,
                          day.count > 0 ? 5 : 0,
                        )}%`,
                      }}
                    />
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sentiment distribution</CardTitle>
            <CardDescription>
              Overall customer feedback sentiment.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {totalFeedback === 0 ? (
              <div className="flex h-36 items-center justify-center text-center text-sm text-muted-foreground">
                No feedback data available yet.
              </div>
            ) : (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                  {sentimentData.map((item) => (
                    <div
                      key={item.label}
                      className={item.color}
                      style={{
                        width: `${(item.value / totalFeedback) * 100}%`,
                      }}
                    />
                  ))}
                </div>

                <div className="space-y-4">
                  {sentimentData.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2.5 rounded-full ${item.color}`}
                        />
                        <span className="text-sm">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium tabular-nums">
                          {item.value}
                        </span>
                        <span className="w-10 text-right text-xs text-muted-foreground">
                          {Math.round((item.value / totalFeedback) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent analyses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent analyses</CardTitle>
            <CardDescription>
              Your latest customer feedback imports.
            </CardDescription>
          </div>

          <Link
            href="/feedback"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Import more <ArrowUpRight className="size-4" />
          </Link>
        </CardHeader>

        <CardContent>
          {analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 rounded-xl bg-muted p-3">
                <MessageSquare className="size-5 text-muted-foreground" />
              </div>

              <p className="font-medium">No analyses yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Import a CSV file to start discovering customer insights.
              </p>

              <Link
                href="/feedback"
                className="mt-4 text-sm font-medium underline underline-offset-4"
              >
                Import feedback
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {analyses.slice(0, 5).map((analysis) => (
                <Link
                  key={analysis.id}
                  href={`/analyses/${analysis.id}`}
                  className="flex flex-col justify-between gap-3 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {analysis.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(analysis.created_at)} ·{" "}
                      {analysis.total_feedback} feedback entries
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
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top issues */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top recurring issues</CardTitle>
            <CardDescription>
              Issues affecting the most feedback entries.
            </CardDescription>
          </div>

          <Link
            href="/issues"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        </CardHeader>

        <CardContent>
          {topIssues.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No issues discovered yet. Import feedback to get started.
            </div>
          ) : (
            <div className="divide-y">
              {topIssues.map((issue) => {
                const priority = issue.priority as Priority;

                return (
                  <div
                    key={issue.id}
                    className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{issue.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {issue.description}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {issueCounts.get(issue.id) ?? 0} feedback
                      </span>

                      <Badge
                        variant="outline"
                        className={`capitalize ${priorityStyles[priority] ?? ""}`}
                      >
                        {issue.priority}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-72 rounded-xl lg:col-span-3" />
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
      </div>

      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={<OverviewLoading />}>
      <OverviewContent />
    </Suspense>
  );
}
