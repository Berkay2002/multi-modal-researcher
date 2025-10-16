import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type ModelParams,
} from "@google/generative-ai";

const API_KEY_ENV_KEYS: readonly string[] = ["GOOGLE_API_KEY", "GEMINI_API_KEY"];

let generativeClient: GoogleGenerativeAI | null = null;

export const resolveGoogleApiKey = (): string => {
  for (const key of API_KEY_ENV_KEYS) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  throw new Error(
    "Missing Google API key. Set GOOGLE_API_KEY or GEMINI_API_KEY in the environment.",
  );
};

export const getGoogleClient = (): GoogleGenerativeAI => {
  if (!generativeClient) {
    generativeClient = new GoogleGenerativeAI(resolveGoogleApiKey());
  }

  return generativeClient;
};

export const createChatModel = (params: {
  model: string;
  temperature: number;
}): ChatGoogleGenerativeAI => {
  return new ChatGoogleGenerativeAI({
    model: params.model,
    temperature: params.temperature,
    apiKey: resolveGoogleApiKey(),
    maxRetries: 2,
  });
};

export const getGenerativeModel = (params: ModelParams): GenerativeModel => {
  return getGoogleClient().getGenerativeModel(params);
};
