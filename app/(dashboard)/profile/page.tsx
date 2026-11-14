import { Suspense } from "react";
import { connection } from "next/server";

import { supabase } from "@/lib/supabase/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata = {
  title: "Profile",
};

async function ProfileContent() {
  await connection();

  const result = await getUserWorkspace();

  if (!result.success) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h1 className="font-semibold">Unable to load profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", result.user.id)
    .maybeSingle();

  if (error) {
    console.error("Profile lookup failed:", error);
    throw new Error("Unable to load profile.");
  }

  return (
    <ProfileForm
      initialName={
        profile?.full_name || result.user.user_metadata?.full_name || ""
      }
      email={result.user.email ?? ""}
    />
  );
}

function ProfileLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileContent />
    </Suspense>
  );
}
