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
  // 1. Resolve authenticated user's workspace
  const workspaceResult = await getUserWorkspace();

  if (!workspaceResult.success) {
    throw new Error(workspaceResult.error);
  }

  const workspaceId = workspaceResult.workspaceId;

  // 2. Validate AI results before creating database records
  const feedbackMap = new Map(feedback.map((item) => [item.id, item]));

  const rows = analysis.items.map((item) => {
    const original = feedbackMap.get(item.feedback_id);

    if (!original) {
      throw new Error(`Original feedback not found: ${item.feedback_id}`);
    }

    return {
      original_text: original.text,
      source: original.source,
      sentiment: item.sentiment,
      category: item.category,
      issue_key: item.issue_key,
      severity: item.severity,
      reason: item.reason,
    };
  });

  // 3. Create analysis record
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
    // 4. Save feedback entries
    const feedbackRows = rows.map((row) => ({
      ...row,
      analysis_id: analysisId,
    }));

    const { data: savedFeedback, error: insertError } = await supabase
      .from("feedback_entries")
      .insert(feedbackRows)
      .select("id, issue_key, severity, category, reason");

    if (insertError) throw insertError;

    // 5. Generate issue clusters
    const { clusterCount } = await persistIssueClusters(
      analysisId,
      savedFeedback,
    );

    // 6. Mark analysis as completed
    const { error: updateError } = await supabase
      .from("analyses")
      .update({ status: "completed" })
      .eq("id", analysisId)
      .eq("workspace_id", workspaceId);

    if (updateError) throw updateError;

    return {
      analysisId,
      clusterCount,
    };
  } catch (error) {
    // Mark analysis as failed
    await supabase
      .from("analyses")
      .update({ status: "failed" })
      .eq("id", analysisId)
      .eq("workspace_id", workspaceId);

    throw error;
  }
}
