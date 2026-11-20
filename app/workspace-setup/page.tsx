"use client";

import { useState } from "react";
import Link from "next/link";

export default function WorkspaceSetupPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createWorkspace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/workspaces/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const result = await response.json();

      if (!response.ok)
        throw new Error(result.error || "Could not create workspace");

      window.location.replace("/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Set up your workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a workspace or accept an invitation from an existing team.
          </p>
        </div>

        <form onSubmit={createWorkspace} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
            minLength={2}
            maxLength={100}
            required
            className="w-full rounded-lg border bg-transparent px-4 py-3 outline-none"
          />
          <button
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create workspace"}
          </button>
        </form>

        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="rounded-lg border p-4 text-center">
          <p className="font-medium">Joining an existing team?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask your workspace owner or admin to invite your email address.
          </p>
          <Link
            href="/invitations"
            className="mt-3 inline-block text-sm font-medium underline"
          >
            Check invitations
          </Link>
        </div>
      </div>
    </main>
  );
}
