const modelId = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const modelNames: Record<string, string> = {
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
};

export const AI_CONFIG = {
  provider: "Google Gemini",
  modelId,
  modelName:
    modelNames[modelId] ||
    modelId
      .replace(/^models\//, "")
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
};
