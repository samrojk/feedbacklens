"use client";

import { useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type UploadResult = {
  analysisId?: string;
  clusterCount?: number;
  summary?: unknown;
  data?: unknown[];
  errors?: unknown[];
};

type UploadState = "idle" | "uploading" | "success" | "error";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function FeedbackPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  function selectFile(selectedFile?: File) {
    if (!selectedFile) return;

    setError("");
    setResult(null);
    setState("idle");

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setError("Please select a CSV file.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("File size exceeds the 5 MB limit.");
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      setError("The selected file is empty.");
      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload() {
    if (!file || state === "uploading") return;

    setState("uploading");
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error || "Something went wrong while analyzing feedback.",
        );
      }

      setResult(payload);
      setState("success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload your file. Please try again.",
      );
      setState("error");
    }
  }

  function resetUpload() {
    setFile(null);
    setResult(null);
    setError("");
    setState("idle");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const feedbackCount = result?.data?.length ?? 0;
  const issueCount = result?.clusterCount ?? 0;
  const invalidCount = result?.errors?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Heading */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4" />
          Feedback intelligence
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Import feedback
        </h1>

        <p className="text-sm text-muted-foreground">
          Upload customer feedback and let AI discover patterns, sentiment, and
          recurring product issues.
        </p>
      </div>

      {/* Upload area */}
      {state !== "success" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload your CSV</CardTitle>
            <CardDescription>
              Import feedback from your support tools, surveys, or customer
              conversations.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                selectFile(event.dataTransfer.files?.[0]);
              }}
              onClick={() => {
                if (state !== "uploading") inputRef.current?.click();
              }}
              className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/20 hover:border-muted-foreground/50 hover:bg-muted/40"
              } ${state === "uploading" ? "pointer-events-none opacity-60" : ""}`}
            >
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-background shadow-sm">
                <Upload className="size-6 text-muted-foreground" />
              </div>

              <p className="font-medium">
                Drop your CSV file here, or{" "}
                <span className="text-primary">browse</span>
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                CSV files only · Maximum file size 5 MB
              </p>
            </div>

            {/* Selected file */}
            {file && (
              <div className="flex items-center gap-3 rounded-xl border bg-background p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <FileSpreadsheet className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <Badge variant="secondary">CSV</Badge>

                {state !== "uploading" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      resetUpload();
                    }}
                    aria-label="Remove selected file"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-destructive">{error}</p>
              </div>
            )}

            {/* Processing */}
            {state === "uploading" && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
                <Loader2 className="size-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">Analyzing your feedback</p>
                  <p className="text-xs text-muted-foreground">
                    Validating entries, identifying sentiment, and grouping
                    recurring issues. This may take a moment.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col justify-between gap-3 border-t pt-5 sm:flex-row sm:items-center">
              <p className="text-xs text-muted-foreground">
                Up to 50 valid feedback entries per upload.
              </p>

              <Button
                onClick={handleUpload}
                disabled={!file || state === "uploading"}
                className="gap-2"
              >
                {state === "uploading" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze feedback
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Successful result */}
      {state === "success" && result && (
        <div className="space-y-5">
          <Card>
            <CardContent className="flex items-start gap-4 pt-6">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">Analysis completed</h2>
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                    Successful
                  </Badge>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {file?.name} has been processed and saved to your workspace.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={resetUpload}
                className="shrink-0 gap-2"
              >
                <RefreshCw className="size-4" />
                New upload
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Feedback analyzed
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {feedbackCount}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Issues discovered
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {issueCount}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Invalid rows</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {invalidCount}
                </p>
              </CardContent>
            </Card>
          </div>

          {invalidCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Rows that couldn't be imported
                </CardTitle>
                <CardDescription>
                  These entries were skipped during CSV validation.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {result.errors?.slice(0, 10).map((item, index) => (
                    <li key={index} className="rounded-md bg-muted/50 p-3">
                      {typeof item === "string" ? item : JSON.stringify(item)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href="/issues">
                Explore discovered issues
                <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>

            <Button variant="outline" asChild>
              <a href="/overview">Back to overview</a>
            </Button>
          </div>
        </div>
      )}

      {/* Format guidance */}
      {state !== "success" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CSV format requirements</CardTitle>
            <CardDescription>
              Your file should contain a column with customer feedback text.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">id</th>
                    <th className="px-4 py-3 font-medium">message</th>
                    <th className="px-4 py-3 font-medium">source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="divide-x">
                    <td className="px-4 py-3 text-muted-foreground">fb_001</td>
                    <td className="px-4 py-3">
                      The dashboard is extremely slow
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      Intercom
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Supported feedback columns include message, feedback, text,
              comment, and content. ID and source columns are optional.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
