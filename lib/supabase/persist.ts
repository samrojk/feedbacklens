import "server-only";

import { supabase } from "@/lib/supabase/server";
import { persistIssueClusters } from "@/lib/supabase/clusters";
import type { ParsedFeedback } from "@/lib/csv/parser";
import type { FeedbackAnalysis } from "@/lib/validations/feedback";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";

interface PersistAnalysisInput {
  feedback: ParsedFeedback[];
  analysis: FeedbackAnalysis;
  title: string;
}

export async function persistAnalysis({
  feedback,
  analysis,
  title,
}: PersistAnalysisInput) {
  const workspaceResult = await getUserWorkspace();

  if (!workspaceResult.success) {
    throw new Error(workspaceResult.error);
  }

  const workspaceId = workspaceResult.workspaceId;

  // 1. Create the analysis record
  const { data: record, error: createError } = await supabase
    .from("analyses")
    .insert({
      workspace_id: workspaceId,
      title,
      status: "processing",
      total_feedback: feedback.length,
    })
    .select("id")
    .single();

  if (createError) throw createError;

  const analysisId = record.id;

  try {
    // 2. Match AI results with original feedback
    const feedbackMap = new Map(feedback.map((item) => [item.id, item]));

    const rows = analysis.items.map((item) => {
      const original = feedbackMap.get(item.feedback_id);

      if (!original) {
        throw new Error(`Original feedback not found: ${item.feedback_id}`);
      }

      return {
        analysis_id: analysisId,
        original_text: original.text,
        source: original.source,
        sentiment: item.sentiment,
        category: item.category,
        issue_key: item.issue_key,
        severity: item.severity,
        reason: item.reason,
      };
    });

    // 3. Save feedback and retrieve actual database UUIDs
    const { data: savedFeedback, error: insertError } = await supabase
      .from("feedback_entries")
      .insert(rows)
      .select("id, issue_key, severity, category, reason");

    if (insertError) throw insertError;

    // 4. Generate issue clusters using saved feedback UUIDs
    const { clusterCount } = await persistIssueClusters(
      analysisId,
      savedFeedback,
    );

    // 5. Mark analysis as completed
    const { error: updateError } = await supabase
      .from("analyses")
      .update({ status: "completed" })
      .eq("id", analysisId);

    if (updateError) throw updateError;

    return {
      analysisId,
      clusterCount,
    };
  } catch (error) {
    // Mark analysis as failed if persistence or clustering fails
    await supabase
      .from("analyses")
      .update({ status: "failed" })
      .eq("id", analysisId);

    throw error;
  }
}
