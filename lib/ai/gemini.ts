import "server-only";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing");
}

export const gemini = new GoogleGenAI({
  apiKey,
});

export const AI_MODEL = "gemini-3.5-flash";
