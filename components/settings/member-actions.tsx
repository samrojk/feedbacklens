"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function MemberActions({
  userId,
  memberRole,
  currentRole,
  isSelf,
}: {
  userId: string;
  memberRole: string;
  currentRole: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canManage =
    !isSelf &&
    memberRole !== "owner" &&
    (currentRole === "owner" ||
      (currentRole === "admin" && memberRole !== "admin"));

  if (!canManage) {
    return (
      <span className="text-xs capitalize text-muted-foreground">
        {memberRole}
      </span>
    );
  }

  async function update(action: "change-role" | "remove", newRole?: string) {
    if (loading) return;

    setLoading(true);
    try {
      const response =
        action === "remove"
          ? await fetch(`/api/workspace-management?userId=${userId}`, {
              method: "DELETE",
            })
          : await fetch("/api/workspace-management", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action, userId, newRole }),
            });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Action failed.");

      toast.success(action === "remove" ? "Member removed." : "Role updated.");
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
    <div className="flex items-center gap-2">
      <select
        aria-label="Member role"
        value={memberRole}
        disabled={loading}
        onChange={(event) => update("change-role", event.target.value)}
        className="h-9 rounded-md border bg-background px-2 text-xs"
      >
        <option value="member">Member</option>
        <option value="viewer">Viewer</option>
        {currentRole === "owner" && <option value="admin">Admin</option>}
      </select>

      <button
        type="button"
        disabled={loading}
        onClick={() => {
          if (window.confirm("Remove this person from the workspace?")) {
            update("remove");
          }
        }}
        className="text-xs text-destructive hover:underline disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}
