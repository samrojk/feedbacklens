import "server-only";
import { GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "@/lib/ai/config";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing");
}

export const gemini = new GoogleGenAI({
  apiKey,
});

export const AI_MODEL = AI_CONFIG.modelId;
