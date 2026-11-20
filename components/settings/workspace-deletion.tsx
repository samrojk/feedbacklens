"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WorkspaceDeletion({
  role,
  deletionScheduledFor,
}: {
  role: string;
  deletionScheduledFor: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (role !== "owner") return null;

  async function run(action: "schedule-deletion" | "cancel-deletion") {
    if (loading) return;

    const message =
      action === "schedule-deletion"
        ? "Schedule this workspace for permanent deletion in 3 days?"
        : "Cancel the scheduled workspace deletion?";

    if (!window.confirm(message)) return;

    setLoading(true);
    try {
      const response = await fetch("/api/workspace-management", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request failed.");

      toast.success(
        action === "schedule-deletion"
          ? "Workspace deletion scheduled."
          : "Workspace deletion cancelled.",
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>
          Permanently delete this workspace and its associated data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {deletionScheduledFor ? (
          <>
            <p className="text-sm">
              Deletion scheduled for{" "}
              <strong>
                {new Date(deletionScheduledFor).toLocaleString("en-IN")}
              </strong>
              . You can cancel before this deadline.
            </p>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => run("cancel-deletion")}
            >
              Cancel scheduled deletion
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              The owner can schedule deletion with a 3-day grace period. After
              that, workspace data is permanently removed.
            </p>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() => run("schedule-deletion")}
            >
              Schedule workspace deletion
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
