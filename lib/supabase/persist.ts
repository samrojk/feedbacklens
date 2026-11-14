import "server-only";

import { supabase } from "@/lib/supabase/server";
import { persistIssueClusters } from "@/lib/supabase/clusters";
import type { ParsedFeedback } from "@/lib/csv/parser";
import type { FeedbackAnalysis } from "@/lib/validations/feedback";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  analysisCacheTag,
  workspaceAnalyticsCacheTag,
} from "@/lib/supabase/cache-tags";

interface PersistAnalysisInput {
  feedback: ParsedFeedback[];
  analysis: FeedbackAnalysis;
  title: string;
  workspaceId: string;
}

function invalidateAnalysisData(workspaceId: string, analysisId: string) {
  revalidateTag(workspaceAnalyticsCacheTag(workspaceId), { expire: 0 });
  revalidateTag(analysisCacheTag(workspaceId, analysisId), { expire: 0 });
  revalidatePath("/overview");
  revalidatePath("/issues");
  revalidatePath(`/analyses/${analysisId}`);
}

export async function persistAnalysis({
  feedback,
  analysis,
  title,
  workspaceId,
}: PersistAnalysisInput) {
  // 1. Validate AI results before creating database records
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

  // 2. Create analysis record
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
  let clusterCount = 0;

  try {
    // 3. Save feedback entries
    const feedbackRows = rows.map((row) => ({
      ...row,
      analysis_id: analysisId,
    }));

    const { data: savedFeedback, error: insertError } = await supabase
      .from("feedback_entries")
      .insert(feedbackRows)
      .select("id, issue_key, severity, category, reason");

    if (insertError) throw insertError;

    // 4. Generate issue clusters
    const result = await persistIssueClusters(analysisId, savedFeedback);
    clusterCount = result.clusterCount;

    // 5. Mark analysis as completed
    const { error: updateError } = await supabase
      .from("analyses")
      .update({ status: "completed" })
      .eq("id", analysisId)
      .eq("workspace_id", workspaceId);

    if (updateError) throw updateError;
  } catch (error) {
    // Mark analysis as failed
    const { error: failureUpdateError } = await supabase
      .from("analyses")
      .update({ status: "failed" })
      .eq("id", analysisId)
      .eq("workspace_id", workspaceId);

    if (failureUpdateError) {
      console.error("Failed to mark analysis as failed:", failureUpdateError);
    }

    invalidateAnalysisData(workspaceId, analysisId);

    throw error;
  }

  invalidateAnalysisData(workspaceId, analysisId);

  return {
    analysisId,
    clusterCount,
  };
}
