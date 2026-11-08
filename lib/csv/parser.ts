import "server-only";
import Papa from "papaparse";

export interface ParsedFeedback {
  id: string;
  text: string;
  source: string;
}

interface CSVParseResult {
  data: ParsedFeedback[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

const MAX_ROWS = 5000;
const MAX_TEXT_LENGTH = 2000;

export function parseFeedbackCSV(csvContent: string): CSVParseResult {
  if (!csvContent.trim()) {
    throw new Error("CSV file is empty");
  }

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) =>
      header.trim().toLowerCase().replace(/\s+/g, "_"),
    transform: (value) => value.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parsing failed: ${parsed.errors[0].message}`);
  }

  const rows = parsed.data;

  if (rows.length > MAX_ROWS) {
    throw new Error(`CSV exceeds maximum limit of ${MAX_ROWS} rows`);
  }

  const headers = parsed.meta.fields ?? [];

  const idColumn = headers.find((header) =>
    ["id", "feedback_id", "ticket_id"].includes(header),
  );

  const textColumn = headers.find((header) =>
    ["message", "feedback", "text", "comment", "content"].includes(header),
  );

  const sourceColumn = headers.find((header) =>
    ["source", "channel", "platform"].includes(header),
  );

  if (!textColumn) {
    throw new Error(
      "Missing feedback column. Expected message, feedback, text, comment or content.",
    );
  }

  const errors: string[] = [];
  const data: ParsedFeedback[] = [];

  rows.forEach((row, index) => {
    const text = row[textColumn]?.trim();

    if (!text) {
      errors.push(`Row ${index + 2}: Missing feedback text`);
      return;
    }

    if (text.length > MAX_TEXT_LENGTH) {
      errors.push(`Row ${index + 2}: Feedback exceeds 2000 characters`);
      return;
    }

    data.push({
      id: idColumn
        ? row[idColumn]?.trim() || `row_${index + 1}`
        : `row_${index + 1}`,
      text,
      source: sourceColumn ? row[sourceColumn]?.trim() || "unknown" : "unknown",
    });
  });

  return {
    data,
    errors,
    totalRows: rows.length,
    validRows: data.length,
  };
}
