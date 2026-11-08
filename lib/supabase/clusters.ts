import "server-only";

import { supabase } from "@/lib/supabase/server";

interface FeedbackEntry {
  id: string;
  issue_key: string;
  severity: number;
  category: string;
  reason: string;
}

function getPriority(
  severities: number[],
): "low" | "medium" | "high" | "critical" {
  const maxSeverity = Math.max(...severities);
  const averageSeverity =
    severities.reduce((sum, value) => sum + value, 0) / severities.length;

  if (maxSeverity === 5 || averageSeverity >= 4.5) {
    return "critical";
  }

  if (maxSeverity >= 4 || averageSeverity >= 3.5) {
    return "high";
  }

  if (averageSeverity >= 2.5) {
    return "medium";
  }

  return "low";
}

function formatTitle(issueKey: string) {
  return issueKey
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function persistIssueClusters(
  analysisId: string,
  feedbackEntries: FeedbackEntry[],
) {
  // 1. Group feedback by issue key
  const groups = new Map<string, FeedbackEntry[]>();

  for (const entry of feedbackEntries) {
    const key = entry.issue_key.trim().toLowerCase() || "uncategorized";

    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }

  // 2. Create one cluster for each issue group
  for (const [issueKey, entries] of groups) {
    const priority = getPriority(entries.map((entry) => entry.severity));

    const description =
      `${entries.length} feedback entries report this issue. ` +
      entries[0].reason;

    const { data: cluster, error: clusterError } = await supabase
      .from("issue_clusters")
      .insert({
        analysis_id: analysisId,
        title: formatTitle(issueKey),
        description,
        priority,
      })
      .select("id")
      .single();

    if (clusterError) throw clusterError;

    // 3. Link feedback entries to their cluster
    const links = entries.map((entry) => ({
      cluster_id: cluster.id,
      feedback_id: entry.id,
    }));

    const { error: linkError } = await supabase
      .from("cluster_feedback")
      .insert(links);

    if (linkError) throw linkError;
  }

  return { clusterCount: groups.size };
}
