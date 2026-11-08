import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/auth-server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  // Prevent external redirect attacks
  const redirectTo =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(redirectTo, url.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", url.origin),
  );
}
