import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          user: null,
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Auth check failed:", error);

    return NextResponse.json(
      { success: false, error: "Authentication check failed" },
      { status: 500 },
    );
  }
}
