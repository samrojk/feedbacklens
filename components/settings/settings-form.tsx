"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Layers3,
  ShieldCheck,
  Save,
  Loader2,
  LockKeyhole,
  Users,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  workspaceName: string;
  role: string;
};

export function SettingsForm({ workspaceName, role }: Props) {
  const router = useRouter();

  const [name, setName] = useState(workspaceName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canManageWorkspace = ["owner", "admin"].includes(role);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageWorkspace || loading) return;

    const trimmedName = name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setError("Workspace name must be between 2 and 100 characters.");
      return;
    }

    if (trimmedName === workspaceName) {
      setMessage("No changes to save.");
      setError("");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          section: "workspace",
          workspaceName: trimmedName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update workspace.");
      }

      setMessage("Workspace updated successfully.");

      // Refresh server components and workspace-aware navigation.
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Workspace preferences</p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Workspace settings
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace details and preferences.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Layers3 className="size-5" />
            </div>

            <div>
              <CardTitle>General</CardTitle>
              <CardDescription>
                Basic information about your workspace.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm font-medium">Your workspace role</p>
                  <p className="text-xs text-muted-foreground">
                    Your permissions in this workspace.
                  </p>
                </div>
              </div>

              <Badge variant="secondary" className="capitalize">
                {role}
              </Badge>
            </div>

            <div className="space-y-2">
              <label htmlFor="workspace-name" className="text-sm font-medium">
                Workspace name
              </label>

              <Input
                id="workspace-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter workspace name"
                minLength={2}
                maxLength={100}
                disabled={!canManageWorkspace || loading}
                required
              />

              <p className="text-xs text-muted-foreground">
                This name appears in your sidebar and dashboard breadcrumb.
              </p>
            </div>

            <Button
              className="mr-4"
              variant="outline"
              render={<Link href="/settings/members" />}
            >
              <Users className="mr-2 size-4" />
              Manage members
            </Button>

            {canManageWorkspace ? (
              <Button
                type="submit"
                disabled={
                  loading ||
                  name.trim().length < 2 ||
                  name.trim() === workspaceName
                }
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Save changes
              </Button>
            ) : (
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <LockKeyhole className="mt-0.5 size-4 shrink-0" />
                <p>
                  Only workspace owners and admins can change workspace
                  settings. Contact an administrator if you need to make
                  changes.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
