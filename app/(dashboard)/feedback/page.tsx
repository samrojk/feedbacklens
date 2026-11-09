"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

interface AnalysisItem {
  feedback_id: string;
  category: string;
  sentiment: string;
  issue_key: string;
  severity: number;
  reason: string;
  source: string;
}

interface UploadResponse {
  success: boolean;
  error?: string;
  message?: string;
  analysisId?: string;
  clusterCount?: number;
  summary?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    analyzedRows: number;
  };
  data?: AnalysisItem[];
  errors?: string[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function FeedbackPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState("");

  function selectFile(selectedFile: File) {
    setError("");
    setResult(null);

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setError("Please select a CSV file.");
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      setError("The selected file is empty.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("File size must not exceed 5 MB.");
      return;
    }

    setFile(selectedFile);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      selectFile(selectedFile);
    }

    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    const droppedFile = event.dataTransfer.files[0];

    if (droppedFile) {
      selectFile(droppedFile);
    }
  }

  async function handleUpload() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data: UploadResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Upload failed.");
      }

      setResult(data);
      setFile(null);
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

  function formatSize(bytes: number) {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
          <Sparkles size={16} />
          Feedback intelligence
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">
          Import feedback
        </h1>

        <p className="max-w-2xl text-sm text-muted-foreground">
          Upload customer feedback and let AI uncover recurring problems,
          customer sentiment, and product opportunities.
        </p>
      </div>

      {/* Upload area */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !loading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragging
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-border hover:border-blue-400 hover:bg-muted/40"
          }`}
        >
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
            <Upload size={26} />
          </div>

          <h2 className="text-lg font-semibold">Drop your CSV file here</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            or click to browse files
          </p>

          <span className="mt-5 rounded-lg border px-4 py-2 text-sm font-medium">
            Choose CSV file
          </span>

          <p className="mt-5 text-xs text-muted-foreground">
            CSV format · Maximum 5 MB · Maximum 50 feedback entries
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />
        </div>

        {/* Selected file */}
        {file && (
          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <FileSpreadsheet className="shrink-0 text-green-600" size={24} />

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setFile(null);
              }}
              disabled={loading}
              aria-label="Remove selected file"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Upload button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
                Analyzing feedback...
              </>
            ) : (
              <>
                Analyze feedback
                <ArrowUpRight size={17} />
              </>
            )}
          </button>
        </div>
      </section>

      {/* Success summary */}
      {result?.success && result.summary && (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-green-600" size={24} />
            <div>
              <h2 className="font-semibold">Analysis completed</h2>
              <p className="text-sm text-muted-foreground">
                Your feedback has been analyzed and saved.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total rows", result.summary.totalRows],
              ["Valid feedback", result.summary.validRows],
              ["Analyzed", result.summary.analyzedRows],
              ["Issue clusters", result.clusterCount ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-card p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {result.data && result.data.length > 0 && (
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b p-5">
                <h3 className="font-semibold">Analyzed feedback</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI-generated classifications for your uploaded entries.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Feedback ID</th>
                      <th className="px-5 py-3 font-medium">Category</th>
                      <th className="px-5 py-3 font-medium">Sentiment</th>
                      <th className="px-5 py-3 font-medium">Severity</th>
                      <th className="px-5 py-3 font-medium">Issue</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {result.data.map((item) => (
                      <tr key={item.feedback_id}>
                        <td className="whitespace-nowrap px-5 py-4 font-medium">
                          {item.feedback_id}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {item.category.replaceAll("_", " ")}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 capitalize">
                          {item.sentiment}
                        </td>
                        <td className="px-5 py-4">{item.severity}/5</td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {item.issue_key.replaceAll("_", " ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
              <p className="font-medium">Some rows were skipped</p>
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                {result.errors.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setResult(null);
              setError("");
            }}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Upload another file
          </button>
        </section>
      )}
    </main>
  );
}
