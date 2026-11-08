import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/auth-server";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().trim().min(2).max(100).optional(),
  workspaceName: z.string().trim().min(2).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid signup details. Password must be at least 8 characters.",
        },
        { status: 400 },
      );
    }

    const { email, password, fullName, workspaceName } = parsed.data;

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
        data: {
          full_name: fullName ?? "",
          workspace_name: workspaceName ?? "",
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: data.session
        ? "Account created successfully"
        : "Account created. Please check your email to confirm your account.",
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      requiresEmailConfirmation: !data.session,
    });
  } catch (error) {
    console.error("Signup failed:", error);

    return NextResponse.json(
      { success: false, error: "Signup failed" },
      { status: 500 },
    );
  }
}
