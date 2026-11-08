import { NextRequest, NextResponse } from "next/server";
import { parseFeedbackCSV } from "@/lib/csv/parser";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "CSV file is required" },
        { status: 400 },
      );
    }

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

    return NextResponse.json({
      success: true,
      message: "CSV processed successfully",
      ...result,
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
