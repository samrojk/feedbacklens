"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Mail, Users } from "lucide-react";
import { toast } from "sonner";

type Invitation = {
  id: string;
  workspace_id: string;
  workspaceName: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
};

export default function InvitationsPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const loadInvitations = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace-invitations/pending", {
        cache: "no-store",
      });

      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      setInvitations(result.invitations ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load invitations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  async function respond(invitationId: string, action: "accept" | "decline") {
    setProcessing(invitationId);

    try {
      const response = await fetch("/api/workspace-invitations/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      toast.success(
        action === "accept"
          ? "Invitation accepted. Welcome to the workspace!"
          : "Invitation declined.",
      );

      setInvitations((current) =>
        current.filter((item) => item.id !== invitationId),
      );

      if (action === "accept") {
        router.push("/overview");
        router.refresh();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to respond.",
      );
    } finally {
      setProcessing(null);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border bg-background">
            <Mail className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Workspace invitations
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review your invitations and choose which workspaces to join.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : unauthorized ? (
          <div className="rounded-xl border bg-background p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Sign in with the email address that received the invitation.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </Link>
          </div>
        ) : invitations.length === 0 ? (
          <div className="rounded-xl border bg-background p-8 text-center">
            <Users className="mx-auto mb-3 size-8 text-muted-foreground" />
            <h2 className="font-medium">No pending invitations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              When someone invites you to a workspace, it will appear here.
            </p>
            <Link
              href="/overview"
              className="mt-5 inline-block text-sm font-medium underline"
            >
              Go to dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="rounded-xl border bg-background p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      {invitation.workspaceName}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Invited as{" "}
                      <span className="font-medium capitalize text-foreground">
                        {invitation.role}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Expires{" "}
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">
                    {invitation.role}
                  </span>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    disabled={processing !== null}
                    onClick={() => respond(invitation.id, "decline")}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    <X className="size-4" />
                    Decline
                  </button>
                  <button
                    disabled={processing !== null}
                    onClick={() => respond(invitation.id, "accept")}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                  >
                    {processing === invitation.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
