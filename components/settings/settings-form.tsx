"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserRound,
  Layers3,
  ShieldCheck,
  LogOut,
  Loader2,
  Save,
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
import { Separator } from "@/components/ui/separator";

type Props = {
  initialName: string;
  email: string;
  workspaceName: string;
  role: string;
};

export function SettingsForm({
  initialName,
  email,
  workspaceName,
  role,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [workspace, setWorkspace] = useState(workspaceName);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canManageWorkspace = ["owner", "admin"].includes(role);

  async function saveSettings(
    section: "profile" | "workspace" | "password",
    values: Record<string, string>,
  ) {
    setLoading(section);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, ...values }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save changes.");
      }

      setMessage(data.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading("");
    }
  }

  async function handleLogout() {
    setLoading("logout");
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to log out.");
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed.");
      setLoading("");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          Account preferences
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, workspace, and security preferences.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <UserRound className="size-5" />
            </div>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Your personal account information.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form
            className="max-w-xl space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveSettings("profile", { fullName: name });
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Full name</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                minLength={2}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <Input value={email} disabled />
              <p className="text-xs text-muted-foreground">
                Your login email is managed through your authentication
                provider.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading !== "" || name.trim() === ""}
            >
              {loading === "profile" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Workspace */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Layers3 className="size-5" />
            </div>
            <div>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>
                Information about your current workspace.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Your role</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your permissions in this workspace.
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {role}
            </Badge>
          </div>

          <form
            className="max-w-xl space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveSettings("workspace", { workspaceName: workspace });
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace name</label>
              <Input
                value={workspace}
                onChange={(event) => setWorkspace(event.target.value)}
                disabled={!canManageWorkspace}
                minLength={2}
                maxLength={100}
                required
              />
              {!canManageWorkspace && (
                <p className="text-xs text-muted-foreground">
                  Only workspace owners and admins can rename this workspace.
                </p>
              )}
            </div>

            {canManageWorkspace && (
              <Button
                type="submit"
                variant="outline"
                disabled={loading !== "" || workspace.trim() === ""}
              >
                {loading === "workspace" && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Save workspace
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>Update your account password.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form
            className="max-w-xl space-y-4"
            onSubmit={(event) => {
              event.preventDefault();

              if (password !== confirmPassword) {
                setError("Passwords do not match.");
                setMessage("");
                return;
              }

              saveSettings("password", { password });
              setPassword("");
              setConfirmPassword("");
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">New password</label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter password again"
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <Button
              type="submit"
              variant="outline"
              disabled={
                loading !== "" ||
                password.length < 8 ||
                confirmPassword.length < 8
              }
            >
              {loading === "password" && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
          <CardDescription>
            Sign out of your current FeedbackLens account on this device.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={loading !== ""}
          >
            {loading === "logout" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 size-4" />
            )}
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
