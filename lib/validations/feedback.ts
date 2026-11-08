import { z } from "zod";

export const feedbackAnalysisSchema = z.object({
  items: z.array(
    z.object({
      feedback_id: z.string(),
      category: z.enum([
        "performance",
        "bug",
        "feature_request",
        "usability",
        "pricing",
        "other",
      ]),
      sentiment: z.enum(["positive", "negative", "neutral"]),
      issue_key: z.string(),
      severity: z.number().int().min(1).max(5),
      reason: z.string(),
    }),
  ),
});

export type FeedbackAnalysis = z.infer<typeof feedbackAnalysisSchema>;
