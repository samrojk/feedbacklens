"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound, ShieldCheck, LogOut, Loader2, Save } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Props = {
  initialName: string;
  email: string;
};

export function ProfileForm({ initialName, email }: Props) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function updateSettings(
    section: "profile" | "password",
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

  async function handlePasswordUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    await updateSettings("password", { password });
    setPassword("");
    setConfirmPassword("");
  }

  async function handleLogout() {
    setLoading("logout");
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to sign out.");
      }

      window.location.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed.");
      setLoading("");
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Personal account</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal information and account security.
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
              <UserRound className="size-5" />
            </div>
            <div>
              <CardTitle>Personal information</CardTitle>
              <CardDescription>Your name and account email.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form
            className="max-w-xl space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              updateSettings("profile", { fullName: name });
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Full name</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <Input value={email} disabled />
              <p className="text-xs text-muted-foreground">
                Email changes are not currently supported.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading !== "" || name.trim().length < 2}
            >
              {loading === "profile" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <CardTitle>Password and security</CardTitle>
              <CardDescription>
                Choose a new password for your account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form className="max-w-xl space-y-4" onSubmit={handlePasswordUpdate}>
            <div className="space-y-2">
              <label className="text-sm font-medium">New password</label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Confirm new password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                placeholder="Enter your new password again"
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

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
          <CardDescription>
            Sign out of FeedbackLens on this device.
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
