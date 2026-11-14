import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/auth-server";

export async function POST() {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("Logout failed:", error);

    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 },
    );
  }
}
