import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeFeedback } from "@/lib/ai/analyze";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";

const requestSchema = z.object({
  feedback: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        text: z.string().trim().min(3).max(2000),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user and verify workspace access
    const workspaceResult = await getUserWorkspace();

    if (!workspaceResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: workspaceResult.error,
        },
        { status: workspaceResult.status },
      );
    }

    // 2. Validate request body
    const body: unknown = await request.json();

    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid feedback input",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { feedback } = validation.data;

    // 3. Reject duplicate IDs
    const ids = feedback.map((item) => item.id);

    if (new Set(ids).size !== ids.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate feedback IDs are not allowed",
        },
        { status: 400 },
      );
    }

    // 4. Analyze feedback using Gemini
    const result = await analyzeFeedback(feedback);

    return NextResponse.json({
      success: true,
      total: result.items.length,
      data: result.items,
    });
  } catch (error) {
    console.error("Feedback analysis failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Feedback analysis failed. Please try again.",
      },
      { status: 500 },
    );
  }
}
