"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: "",
    workspaceName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  }

  async function submitSignup(skipWorkspace = false) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          workspaceName: skipWorkspace ? "" : form.workspaceName.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Signup failed");

      if (result.requiresEmailConfirmation) {
        setMessage(result.message);
        return;
      }

      window.location.replace(
        skipWorkspace || !form.workspaceName.trim()
          ? "/workspace-setup"
          : "/overview",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleAccountSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setStep(2);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-xs text-muted-foreground">STEP {step} OF 2</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {step === 1 ? "Create your account" : "Create your workspace"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === 1
              ? "Start turning customer feedback into product insights."
              : "A workspace keeps your feedback and team together. You can do this later."}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <input
              name="fullName"
              placeholder="Full name"
              value={form.fullName}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={100}
              className="w-full rounded-lg border bg-transparent px-4 py-3 outline-none"
            />
            <input
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border bg-transparent px-4 py-3 outline-none"
            />
            <input
              name="password"
              type="password"
              placeholder="Password (minimum 8 characters)"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full rounded-lg border bg-transparent px-4 py-3 outline-none"
            />
            <button className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground">
              Continue
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <input
              name="workspaceName"
              placeholder="e.g. Acme Product Team"
              value={form.workspaceName}
              onChange={handleChange}
              maxLength={100}
              className="w-full rounded-lg border bg-transparent px-4 py-3 outline-none"
            />
            <button
              onClick={() => submitSignup(false)}
              disabled={loading || form.workspaceName.trim().length < 2}
              className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create workspace & account"}
            </button>
            <button
              onClick={() => submitSignup(true)}
              disabled={loading}
              className="w-full rounded-lg border px-4 py-3 font-medium disabled:opacity-50"
            >
              Skip for now
            </button>
            <button
              onClick={() => setStep(1)}
              disabled={loading}
              className="w-full text-sm text-muted-foreground"
            >
              Go back
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-green-600">
            {message}
          </p>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
