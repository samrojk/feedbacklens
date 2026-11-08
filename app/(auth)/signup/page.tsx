"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Signup failed");
      }

      if (result.requiresEmailConfirmation) {
        setMessage(result.message);
        return;
      }

      router.push("/overview");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground">
            Start turning customer feedback into product insights.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            name="workspaceName"
            placeholder="Workspace name"
            value={form.workspaceName}
            onChange={handleChange}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

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
