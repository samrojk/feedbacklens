import "server-only";

import { supabase } from "@/lib/supabase/server";
import type { ParsedFeedback } from "@/lib/csv/parser";
import type { FeedbackAnalysis } from "@/lib/validations/feedback";

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
  const workspaceId = process.env.FEEDBACKLENS_WORKSPACE_ID;

  if (!workspaceId) {
    throw new Error("FEEDBACKLENS_WORKSPACE_ID is missing");
  }

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
      };
    });

    // 3. Save all feedback entries
    const { error: insertError } = await supabase
      .from("feedback_entries")
      .insert(rows);

    if (insertError) throw insertError;

    // 4. Mark analysis as completed
    const { error: updateError } = await supabase
      .from("analyses")
      .update({ status: "completed" })
      .eq("id", analysisId);

    if (updateError) throw updateError;

    return { analysisId };
  } catch (error) {
    // Mark the analysis as failed if persistence fails
    await supabase
      .from("analyses")
      .update({ status: "failed" })
      .eq("id", analysisId);

    throw error;
  }
}
