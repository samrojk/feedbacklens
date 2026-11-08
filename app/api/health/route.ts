import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { error } = await supabase.from("workspaces").select("id").limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      database: "connected",
      service: "FeedbackLens API",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        success: false,
        database: "disconnected",
      },
      { status: 500 },
    );
  }
}
