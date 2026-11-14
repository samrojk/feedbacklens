"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteMemberForm() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Enter an email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/workspace-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send invitation.");
      }

      toast.success(result.message || "Invitation sent!");
      setEmail("");
      setRole("member");
      setOpen(false);
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
    <div className="space-y-4">
      <Button onClick={() => setOpen(!open)}>
        {open ? (
          <X className="mr-2 size-4" />
        ) : (
          <UserPlus className="mr-2 size-4" />
        )}
        {open ? "Cancel" : "Add member"}
      </Button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="max-w-xl space-y-4 rounded-xl border bg-card p-5"
        >
          <div>
            <h3 className="font-semibold">Invite a team member</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Send an invitation to join this workspace.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="invite-email" className="text-sm font-medium">
              Email address
            </label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="invite-role" className="text-sm font-medium">
              Workspace role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              {loading ? "Sending..." : "Send invitation"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
