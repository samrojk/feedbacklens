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
        external_id: item.feedback_id,
        original_text: original.text,
        source: original.source,
        sentiment: item.sentiment,
        category: item.category,
        issue_key: item.issue_key,
        severity: item.severity,
      };
    });

    // 3. Save feedback and retrieve database UUIDs
    const { data: savedEntries, error: insertError } = await supabase
      .from("feedback_entries")
      .insert(rows)
      .select("id, external_id");

    if (insertError) throw insertError;

    if (!savedEntries || savedEntries.length !== analysis.items.length) {
      throw new Error("Could not retrieve all saved feedback entries");
    }

    // 4. Map CSV IDs to Supabase UUIDs
    const savedIdMap = new Map(
      savedEntries.map((entry) => [entry.external_id, entry.id]),
    );

    const feedbackEntries = analysis.items.map((item) => {
      const databaseId = savedIdMap.get(item.feedback_id);

      if (!databaseId) {
        throw new Error(`Saved feedback UUID not found: ${item.feedback_id}`);
      }

      return {
        id: databaseId,
        issue_key: item.issue_key,
        severity: item.severity,
        category: item.category,
        reason: item.reason,
      };
    });

    // 5. Mark analysis as completed
    const { error: updateError } = await supabase
      .from("analyses")
      .update({ status: "completed" })
      .eq("id", analysisId);

    if (updateError) throw updateError;

    return {
      analysisId,
      feedbackEntries,
    };
  } catch (error) {
    // Mark the analysis as failed if persistence fails
    await supabase
      .from("analyses")
      .update({ status: "failed" })
      .eq("id", analysisId);

    throw error;
  }
}
