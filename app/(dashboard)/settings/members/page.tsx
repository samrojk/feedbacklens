import { Suspense } from "react";
import { connection } from "next/server";
import { Users, ShieldCheck } from "lucide-react";

import { supabase } from "@/lib/supabase/server";
import { getUserWorkspace } from "@/lib/supabase/get-workspace";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const metadata = {
  title: "Workspace members",
};

async function MembersContent() {
  await connection();

  const result = await getUserWorkspace();

  if (!result.success) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          {result.error}
        </CardContent>
      </Card>
    );
  }

  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("id, user_id, role, created_at")
    .eq("workspace_id", result.workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Members lookup failed:", error);
    throw new Error("Unable to load workspace members.");
  }

  const userIds = [...new Set((members ?? []).map((m) => m.user_id))];

  const { data: profiles, error: profileError } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)
      : { data: [], error: null };

  if (profileError) {
    console.error("Member profiles lookup failed:", profileError);
    throw new Error("Unable to load member profiles.");
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
  );

  const currentUserRole = result.role;
  const canManageMembers = ["owner", "admin"].includes(currentUserRole);

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Workspace management</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          People who have access to {result.workspace.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-muted p-3">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total members</p>
              <p className="text-2xl font-semibold tabular-nums">
                {members?.length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-muted p-3">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your role</p>
              <p className="text-2xl font-semibold capitalize">
                {currentUserRole}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Team members</CardTitle>
              <CardDescription>
                Workspace access and assigned roles.
              </CardDescription>
            </div>

            <Badge variant="secondary">{members?.length ?? 0} members</Badge>
          </div>
        </CardHeader>

        <CardContent>
          {!members?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No members found.
            </p>
          ) : (
            <div className="divide-y">
              {members.map((member) => {
                const name =
                  profileMap.get(member.user_id) || "Workspace member";

                const initials = name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase();

                return (
                  <div key={member.id} className="flex items-center gap-3 py-4">
                    <Avatar className="size-10">
                      <AvatarFallback>{initials || "U"}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {name}
                        {member.user_id === result.user.id && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined{" "}
                        {new Date(member.created_at).toLocaleDateString(
                          "en-IN",
                        )}
                      </p>
                    </div>

                    <Badge variant="outline" className="capitalize">
                      {member.role}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          {!canManageMembers && (
            <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              You have read-only access to workspace membership.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MembersLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<MembersLoading />}>
      <MembersContent />
    </Suspense>
  );
}
