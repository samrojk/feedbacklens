import { NextRequest, NextResponse } from "next/server";
import { persistAnalysis } from "@/lib/supabase/persist";
import { parseFeedbackCSV } from "@/lib/csv/parser";
import { analyzeFeedback } from "@/lib/ai/analyze";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FEEDBACK_ENTRIES = 50;

export async function POST(request: NextRequest) {
  try {
    // 1. Extract uploaded CSV
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "CSV file is required" },
        { status: 400 },
      );
    }

    // 2. Validate file
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { success: false, error: "Only CSV files are supported" },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: "File is empty" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Maximum file size is 5 MB" },
        { status: 413 },
      );
    }

    // 3. Parse and validate CSV
    const csvContent = await file.text();
    const result = parseFeedbackCSV(csvContent);

    if (result.validRows === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid feedback rows found",
          details: result,
        },
        { status: 422 },
      );
    }

    // 4. Enforce AI batch limit
    if (result.validRows > MAX_FEEDBACK_ENTRIES) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_FEEDBACK_ENTRIES} valid feedback entries per upload`,
          totalRows: result.totalRows,
          validRows: result.validRows,
        },
        { status: 422 },
      );
    }

    // 5. Analyze feedback using Gemini
    let analysis;

    try {
      analysis = await analyzeFeedback(
        result.data.map(({ id, text }) => ({
          id,
          text,
        })),
      );
    } catch (error) {
      console.error("Gemini analysis failed:", error);

      return NextResponse.json(
        {
          success: false,
          error: "AI analysis failed. Please try again.",
        },
        { status: 502 },
      );
    }

    // 6. Save analysis and feedback to Supabase
    const { analysisId } = await persistAnalysis({
      feedback: result.data,
      analysis,
      title: file.name.replace(/\.csv$/i, ""),
    });

    // 7. Preserve original feedback sources
    const sourceMap = new Map(
      result.data.map((item) => [item.id, item.source]),
    );

    const analyzedItems = analysis.items.map((item) => ({
      ...item,
      source: sourceMap.get(item.feedback_id) ?? "unknown",
    }));

    // 8. Return structured results
    return NextResponse.json({
      success: true,
      message: "CSV uploaded, analyzed and saved successfully",
      analysisId,

      summary: {
        totalRows: result.totalRows,
        validRows: result.validRows,
        invalidRows: result.errors.length,
        analyzedRows: analyzedItems.length,
      },

      data: analyzedItems,
      errors: result.errors,
    });
  } catch (error) {
    console.error("CSV upload failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "CSV processing failed",
      },
      { status: 400 },
    );
  }
}
