/**
 * AI Provider for GitHub Action
 *
 * Simplified version of the core AI provider.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";

export type AIProvider = "anthropic" | "openai" | "google";
export type QualityMode = "standard" | "high";

const MODEL_CONFIG = {
  anthropic: {
    standard: "claude-sonnet-4-20250514",
    high: "claude-sonnet-4-20250514",
  },
  openai: {
    standard: "gpt-4o",
    high: "gpt-4o",
  },
  google: {
    standard: "gemini-2.0-flash",
    high: "gemini-2.0-flash",
  },
} as const;

export interface AIProviderInstance {
  generateText: (options: {
    prompt: string;
    system?: string;
    temperature?: number;
  }) => Promise<{ text: string }>;
  provider: AIProvider;
  quality: QualityMode;
}

export function createAIProvider(
  provider: AIProvider,
  quality: QualityMode,
  apiKey: string
): AIProviderInstance {
  const model = getModel(provider, quality, apiKey);

  return {
    provider,
    quality,
    generateText: async (options) => {
      const result = await generateText({
        model,
        prompt: options.prompt,
        system: options.system,
        temperature: options.temperature ?? 0.7,
      });
      return { text: result.text };
    },
  };
}

function getModel(
  provider: AIProvider,
  quality: QualityMode,
  apiKey: string
): LanguageModel {
  const modelId = MODEL_CONFIG[provider][quality];

  switch (provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelId);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(modelId);
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelId);
    }
  }
}
