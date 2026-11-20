import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/auth-server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const invitationId = url.searchParams.get("invitation_id");

  const redirectTo =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const destination = invitationId
        ? "/invitations"
        : user?.user_metadata?.workspace_name?.trim()
          ? "/overview"
          : "/workspace-setup";

      return NextResponse.redirect(new URL(destination, url.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", url.origin),
  );
}
