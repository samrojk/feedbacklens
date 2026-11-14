"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-64 max-w-lg flex-col items-center justify-center text-center">
      <h2 className="text-lg font-semibold">Unable to load this page</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Try again
      </button>
    </div>
  );
}
